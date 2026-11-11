package golem

import (
	"archive/zip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	zipAsset      = "golem-miners-webgl.zip"
	manifestAsset = "webgl-manifest.json"
	sumsAsset     = "SHA256SUMS"

	// The zip is about 65 MiB today. These ceilings only stop a hostile or
	// broken release from filling the disk of a free instance.
	maxZipBytes   = 200 << 20
	maxFileBytes  = 150 << 20
	maxSmallAsset = 1 << 20

	// failureCooldown stops a bad release from being re-downloaded on every
	// request. Without it a failing checksum would cost 65 MiB per visitor.
	failureCooldown = time.Minute

	// otherLoadInterval bounds how often ?tag= can make this instance download
	// a build other than the default one.
	otherLoadInterval = time.Minute
)

var (
	errNotConfigured = errors.New("golem token not configured")
	errUnknownTag    = errors.New("unknown golem build tag")
	errRateLimited   = errors.New("another build was loaded too recently")
)

// servedFile is how a browser must receive one of the four files. The .unityweb
// files are gzip, and Unity's loader inflates them only if the response to the
// browser says Content-Encoding: gzip. The file route does not say so itself:
// see GetFile.
type servedFile struct {
	contentType string
	encoding    string
}

// fileOrder is the allowlist of files the endpoint serves and the order the
// metadata lists them in. Nothing else in the zip is ever read to disk.
var fileOrder = []string{
	"WebGL.data.unityweb",
	"WebGL.framework.js.unityweb",
	"WebGL.wasm.unityweb",
	"WebGL.loader.js",
}

var served = map[string]servedFile{
	"WebGL.data.unityweb":         {contentType: "application/octet-stream", encoding: "gzip"},
	"WebGL.framework.js.unityweb": {contentType: "application/javascript", encoding: "gzip"},
	"WebGL.wasm.unityweb":         {contentType: "application/wasm", encoding: "gzip"},
	"WebGL.loader.js":             {contentType: "application/javascript"},
}

// manifest is the subset of webgl-manifest.json this package reads. The game
// repo's docs/production-webgl.md owns the contract.
type manifest struct {
	Version      string `json:"version"`
	GitSHA       string `json:"gitSha"`
	UnityVersion string `json:"unityVersion"`
	ReleaseTag   string `json:"releaseTag"`
	RunURL       string `json:"runUrl"`
	BuiltAt      string `json:"builtAt"`
	Archive      struct {
		File   string `json:"file"`
		SHA256 string `json:"sha256"`
		Size   int64  `json:"size"`
	} `json:"archive"`
}

// builtFile is one extracted file. sha256 and size describe the bytes on disk,
// which are the bytes served, so a gzip file's hash is of the gzip stream.
type builtFile struct {
	path   string
	sha256 string
	size   int64
}

// build is one fully verified release on disk. A build is only ever created
// after every check passed, so holding one means it is safe to serve.
type build struct {
	tag          string
	version      string
	gitSHA       string
	unityVersion string
	runURL       string
	builtAt      time.Time
	dir          string
	files        map[string]builtFile
}

type failure struct {
	err error
	at  time.Time
}

type loadCall struct {
	done chan struct{}
	b    *build
	err  error
}

// store keeps at most two builds on disk: current, the one the default route
// serves (and the fallback when a newer release fails verification), and
// other, which holds the build the default route just moved off, or the last
// build someone asked for by tag. Two bounds the disk use on a free instance.
type store struct {
	now func() time.Time

	rootMu sync.Mutex
	root   string // created on first load, so tests and cold boots touch no disk

	mu            sync.Mutex
	current       *build
	other         *build
	loading       map[string]*loadCall
	failed        map[string]failure
	lastOtherLoad time.Time
}

func newStore() *store {
	return &store{
		now:     time.Now,
		loading: make(map[string]*loadCall),
		failed:  make(map[string]failure),
	}
}

func (s *store) rootDir() (string, error) {
	s.rootMu.Lock()
	defer s.rootMu.Unlock()
	if s.root == "" {
		dir, err := os.MkdirTemp("", "golem-builds-")
		if err != nil {
			return "", fmt.Errorf("creating build dir: %w", err)
		}
		s.root = dir
	}
	return s.root, nil
}

// resident returns the build for tag if it is already on disk.
func (s *store) resident(tag string) *build {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.residentLocked(tag)
}

func (s *store) residentLocked(tag string) *build {
	for _, b := range []*build{s.current, s.other} {
		if b != nil && b.tag == tag {
			return b
		}
	}
	return nil
}

// lastGood is the newest default build that passed verification, or nil.
func (s *store) lastGood() *build {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.current
}

// get returns the verified build for rel, loading it if needed. Concurrent
// callers for one tag share a single download. A tag that failed recently
// returns the same error without another download.
func (s *store) get(rel ghRelease, isDefault bool, load func(ghRelease) (*build, error)) (*build, error) {
	tag := rel.TagName

	s.mu.Lock()
	if b := s.residentLocked(tag); b != nil {
		s.mu.Unlock()
		return b, nil
	}
	if f, ok := s.failed[tag]; ok && s.now().Sub(f.at) < failureCooldown {
		s.mu.Unlock()
		return nil, f.err
	}
	if call, ok := s.loading[tag]; ok {
		s.mu.Unlock()
		<-call.done
		return call.b, call.err
	}
	if !isDefault {
		if !s.lastOtherLoad.IsZero() && s.now().Sub(s.lastOtherLoad) < otherLoadInterval {
			s.mu.Unlock()
			return nil, errRateLimited
		}
		s.lastOtherLoad = s.now()
	}

	call := &loadCall{done: make(chan struct{})}
	s.loading[tag] = call
	// This load replaces the other slot on success, so free its disk first.
	// A file handle already open for a download in flight stays valid.
	evicted := s.other
	s.other = nil
	s.mu.Unlock()

	if evicted != nil {
		_ = os.RemoveAll(evicted.dir)
	}

	b, err := load(rel)

	s.mu.Lock()
	delete(s.loading, tag)
	if err != nil {
		s.failed[tag] = failure{err: err, at: s.now()}
	} else {
		delete(s.failed, tag)
		if isDefault {
			s.other = s.current
			s.current = b
		} else {
			s.other = b
		}
	}
	call.b, call.err = b, err
	s.mu.Unlock()
	close(call.done)

	return b, err
}

// loadBuild downloads rel's zip, checks it against every checksum the release
// carries, and extracts the four files. Every asset URL comes from rel, so a
// release published while this runs cannot mix files from two builds. A build
// is renamed into place only after all checks pass.
func (h *Handler) loadBuild(rel ghRelease) (*build, error) {
	ctx, cancel := context.WithTimeout(context.Background(), downloadTimeout)
	defer cancel()

	assets := make(map[string]ghAsset, len(rel.Assets))
	for _, a := range rel.Assets {
		assets[a.Name] = a
	}
	for _, name := range []string{zipAsset, manifestAsset, sumsAsset} {
		if _, ok := assets[name]; !ok {
			return nil, fmt.Errorf("release %s has no %s asset", rel.TagName, name)
		}
	}

	manifestBytes, err := h.fetchSmall(ctx, assets[manifestAsset].URL)
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", manifestAsset, err)
	}
	var m manifest
	if err := json.Unmarshal(manifestBytes, &m); err != nil {
		return nil, fmt.Errorf("decoding %s: %w", manifestAsset, err)
	}
	sumsBytes, err := h.fetchSmall(ctx, assets[sumsAsset].URL)
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", sumsAsset, err)
	}

	want, err := checkMetadata(rel, assets[zipAsset], m, sumsBytes)
	if err != nil {
		return nil, err
	}
	builtAt, err := time.Parse(time.RFC3339Nano, m.BuiltAt)
	if err != nil {
		return nil, fmt.Errorf("manifest builtAt %q: %w", m.BuiltAt, err)
	}

	root, err := h.store.rootDir()
	if err != nil {
		return nil, err
	}
	zipPath, err := h.downloadZip(ctx, assets[zipAsset].URL, root, want, m.Archive.Size)
	if err != nil {
		return nil, err
	}
	defer os.Remove(zipPath)

	partial, err := os.MkdirTemp(root, "partial-")
	if err != nil {
		return nil, fmt.Errorf("creating build dir: %w", err)
	}
	files, err := extractFiles(zipPath, partial)
	if err != nil {
		_ = os.RemoveAll(partial)
		return nil, err
	}

	// A tag is unique, so its hash names the directory without putting tag
	// characters in a path.
	tagHash := sha256.Sum256([]byte(rel.TagName))
	final := filepath.Join(root, hex.EncodeToString(tagHash[:8]))
	_ = os.RemoveAll(final)
	if err := os.Rename(partial, final); err != nil {
		_ = os.RemoveAll(partial)
		return nil, fmt.Errorf("publishing build: %w", err)
	}
	for name, f := range files {
		f.path = filepath.Join(final, name)
		files[name] = f
	}

	return &build{
		tag:          rel.TagName,
		version:      m.Version,
		gitSHA:       m.GitSHA,
		unityVersion: m.UnityVersion,
		runURL:       m.RunURL,
		builtAt:      builtAt,
		dir:          final,
		files:        files,
	}, nil
}

// checkMetadata cross-checks the release, the manifest and SHA256SUMS before
// any large download. It returns the zip hash every source agrees on.
func checkMetadata(rel ghRelease, zipRef ghAsset, m manifest, sums []byte) (string, error) {
	if m.ReleaseTag != rel.TagName {
		return "", fmt.Errorf("manifest is for tag %q, release is %q", m.ReleaseTag, rel.TagName)
	}
	if m.Archive.File != zipAsset {
		return "", fmt.Errorf("manifest archive is %q, want %q", m.Archive.File, zipAsset)
	}
	if m.Version == "" || m.GitSHA == "" {
		return "", errors.New("manifest has no version or gitSha")
	}
	if zipRef.Size != 0 && zipRef.Size != m.Archive.Size {
		return "", fmt.Errorf("release lists a %d byte zip, manifest says %d", zipRef.Size, m.Archive.Size)
	}
	sum, ok := parseSums(sums)[zipAsset]
	if !ok {
		return "", fmt.Errorf("%s has no entry for %s", sumsAsset, zipAsset)
	}
	if !strings.EqualFold(sum, m.Archive.SHA256) {
		return "", errors.New("SHA256SUMS and the manifest disagree about the zip checksum")
	}
	return strings.ToLower(sum), nil
}

// parseSums reads sha256sum output: "<hex>  <name>", with an optional "*"
// before the name in binary mode.
func parseSums(data []byte) map[string]string {
	sums := make(map[string]string)
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) != 2 || len(fields[0]) != sha256.Size*2 {
			continue
		}
		if _, err := hex.DecodeString(fields[0]); err != nil {
			continue
		}
		sums[strings.TrimPrefix(fields[1], "*")] = strings.ToLower(fields[0])
	}
	return sums
}

// fetchSmall reads a small release asset such as the manifest.
func (h *Handler) fetchSmall(ctx context.Context, assetURL string) ([]byte, error) {
	resp, err := h.getAsset(ctx, h.client, assetURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxSmallAsset+1))
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}
	if len(body) > maxSmallAsset {
		return nil, errors.New("asset is unexpectedly large")
	}
	return body, nil
}

// getAsset starts a release-asset download. Accept: application/octet-stream
// makes GitHub return the bytes, and anything else returns JSON metadata with
// a 200. The token goes only to the API host. Go drops Authorization when the
// asset redirects to GitHub's storage host.
func (h *Handler) getAsset(ctx context.Context, client *http.Client, assetURL string) (*http.Response, error) {
	if !strings.HasPrefix(assetURL, h.baseURL+"/") {
		return nil, errors.New("asset URL is not on the GitHub API host")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, assetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("building request: %w", err)
	}
	req.Header.Set("Accept", "application/octet-stream")
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Authorization", "Bearer "+h.cfg.GolemGHToken)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}
	return resp, nil
}

// downloadZip streams the zip to disk while hashing it, and fails unless the
// hash and size match what SHA256SUMS and the manifest promised.
func (h *Handler) downloadZip(ctx context.Context, assetURL, root, wantSum string, wantSize int64) (string, error) {
	resp, err := h.getAsset(ctx, h.dlClient, assetURL)
	if err != nil {
		return "", fmt.Errorf("downloading zip: %w", err)
	}
	defer resp.Body.Close()

	f, err := os.CreateTemp(root, "zip-*")
	if err != nil {
		return "", fmt.Errorf("creating zip file: %w", err)
	}
	path := f.Name()
	fail := func(err error) (string, error) {
		f.Close()
		_ = os.Remove(path)
		return "", err
	}

	hasher := sha256.New()
	n, err := io.Copy(io.MultiWriter(f, hasher), io.LimitReader(resp.Body, maxZipBytes+1))
	if err != nil {
		return fail(fmt.Errorf("downloading zip: %w", err))
	}
	if n > maxZipBytes {
		return fail(errors.New("zip is larger than the allowed maximum"))
	}
	if n != wantSize {
		return fail(fmt.Errorf("zip is %d bytes, manifest says %d", n, wantSize))
	}
	if got := hex.EncodeToString(hasher.Sum(nil)); got != wantSum {
		return fail(fmt.Errorf("zip checksum mismatch: got %s, SHA256SUMS says %s", got, wantSum))
	}
	if err := f.Close(); err != nil {
		_ = os.Remove(path)
		return "", fmt.Errorf("writing zip: %w", err)
	}
	return path, nil
}

// extractFiles writes the four allowlisted files from the zip's Build/ folder
// into dir. It never uses a name from the zip as a path. archive/zip checks
// each file's CRC as the file is read to its end.
func extractFiles(zipPath, dir string) (map[string]builtFile, error) {
	zr, err := zip.OpenReader(zipPath)
	if err != nil {
		return nil, fmt.Errorf("opening zip: %w", err)
	}
	defer zr.Close()

	byName := make(map[string]*zip.File, len(zr.File))
	for _, zf := range zr.File {
		if _, dup := byName[zf.Name]; dup {
			return nil, fmt.Errorf("zip lists %s twice", zf.Name)
		}
		byName[zf.Name] = zf
	}

	files := make(map[string]builtFile, len(fileOrder))
	for _, name := range fileOrder {
		zf, ok := byName["Build/"+name]
		if !ok {
			return nil, fmt.Errorf("zip has no Build/%s", name)
		}
		bf, err := extractOne(zf, filepath.Join(dir, name), strings.HasSuffix(name, ".unityweb"))
		if err != nil {
			return nil, fmt.Errorf("extracting %s: %w", name, err)
		}
		files[name] = bf
	}
	return files, nil
}

func extractOne(zf *zip.File, dest string, wantGzip bool) (builtFile, error) {
	if zf.UncompressedSize64 > maxFileBytes {
		return builtFile{}, errors.New("file is larger than the allowed maximum")
	}
	rc, err := zf.Open()
	if err != nil {
		return builtFile{}, err
	}
	defer rc.Close()

	out, err := os.Create(dest)
	if err != nil {
		return builtFile{}, err
	}
	hasher := sha256.New()
	n, err := io.Copy(io.MultiWriter(out, hasher), io.LimitReader(rc, maxFileBytes+1))
	if cerr := out.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		return builtFile{}, err
	}
	if n == 0 || n > maxFileBytes {
		return builtFile{}, fmt.Errorf("unexpected size %d", n)
	}
	if wantGzip {
		// The browser will be told Content-Encoding: gzip. A brotli or plain
		// build would reach it as garbage.
		head := make([]byte, 2)
		in, err := os.Open(dest)
		if err != nil {
			return builtFile{}, err
		}
		_, err = io.ReadFull(in, head)
		in.Close()
		if err != nil || head[0] != 0x1f || head[1] != 0x8b {
			return builtFile{}, errors.New("not gzip. Build with Compression Format set to Gzip")
		}
	}
	return builtFile{path: dest, sha256: hex.EncodeToString(hasher.Sum(nil)), size: n}, nil
}
