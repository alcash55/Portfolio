package main

import (
	"bytes"
	"log"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// captureLog redirects the standard logger's output into a buffer for the
// duration of the test, restoring the previous output and flags on cleanup.
// loadEnv reports through log.Printf rather than returning an error, so this
// is the only way to assert on what it told the operator.
func captureLog(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	prevOutput := log.Writer()
	prevFlags := log.Flags()
	log.SetOutput(&buf)
	log.SetFlags(0)
	t.Cleanup(func() {
		log.SetOutput(prevOutput)
		log.SetFlags(prevFlags)
	})
	return &buf
}

// chdir points the process at dir for the duration of the test and restores
// the original working directory on cleanup. loadEnv reads os.Getwd()
// directly rather than taking a directory argument, so exercising its walk
// means moving the real working directory - these tests cannot run with
// t.Parallel, since the working directory is process-global state.
func chdir(t *testing.T, dir string) {
	t.Helper()
	orig, err := os.Getwd()
	if err != nil {
		t.Fatalf("os.Getwd() before chdir: %v", err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatalf("os.Chdir(%q): %v", dir, err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(orig); err != nil {
			t.Fatalf("restoring working directory to %q: %v", orig, err)
		}
	})
}

// writeFile creates path with contents, including any missing parent
// directories.
func writeFile(t *testing.T, path, contents string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("MkdirAll(%q): %v", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatalf("WriteFile(%q): %v", path, err)
	}
}

// TestLoadEnv_DirectoryWalk pins the boundary loadEnv walks up to look for
// a .env file: it must find one above the working directory, but must never
// cross a go.mod into an unrelated ancestor to find one. An off-by-one here
// would show up in the field as "my local .env stopped loading" with
// nothing catching the regression first.
func TestLoadEnv_DirectoryWalk(t *testing.T) {
	const (
		keyAtCWD   = "LOAD_ENV_TEST_AT_CWD"
		keyAbove   = "LOAD_ENV_TEST_ABOVE_CWD"
		keyOutside = "LOAD_ENV_TEST_OUTSIDE_MODULE"
	)
	allKeys := []string{keyAtCWD, keyAbove, keyOutside}

	tests := []struct {
		name string
		// build lays out a fixture tree under root and returns the
		// directory loadEnv should run from.
		build   func(root string) (cwd string)
		wantKey string // env var loadEnv should have set; "" means none
	}{
		{
			name: ".env present at the working directory",
			build: func(root string) string {
				writeFile(t, filepath.Join(root, "go.mod"), "module fixture\n")
				writeFile(t, filepath.Join(root, ".env"), keyAtCWD+"=loaded\n")
				return root
			},
			wantKey: keyAtCWD,
		},
		{
			name: ".env present above the working directory",
			build: func(root string) string {
				writeFile(t, filepath.Join(root, "go.mod"), "module fixture\n")
				writeFile(t, filepath.Join(root, ".env"), keyAbove+"=loaded\n")
				cwd := filepath.Join(root, "cmd", "app")
				if err := os.MkdirAll(cwd, 0o755); err != nil {
					t.Fatalf("MkdirAll(%q): %v", cwd, err)
				}
				return cwd
			},
			wantKey: keyAbove,
		},
		{
			name: "no .env found before the go.mod boundary",
			build: func(root string) string {
				// The only .env sits outside the module. go.mod marks the
				// boundary loadEnv must stop at rather than climbing past
				// it to find an unrelated .env higher in the filesystem.
				writeFile(t, filepath.Join(root, ".env"), keyOutside+"=loaded\n")
				moduleRoot := filepath.Join(root, "module")
				writeFile(t, filepath.Join(moduleRoot, "go.mod"), "module fixture\n")
				return moduleRoot
			},
			wantKey: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, key := range allKeys {
				os.Unsetenv(key)
			}
			t.Cleanup(func() {
				for _, key := range allKeys {
					os.Unsetenv(key)
				}
			})

			root := t.TempDir()
			cwd := tt.build(root)
			chdir(t, cwd)

			loadEnv()

			if tt.wantKey == "" {
				for _, key := range allKeys {
					if v, ok := os.LookupEnv(key); ok {
						t.Errorf("loadEnv() from %q set %s=%q, want no .env variable set (the go.mod boundary should have stopped the walk before reaching it)", cwd, key, v)
					}
				}
				return
			}

			got, ok := os.LookupEnv(tt.wantKey)
			if !ok {
				t.Errorf("loadEnv() from %q did not set %s, want it loaded from the .env in this tree", cwd, tt.wantKey)
				return
			}
			if got != "loaded" {
				t.Errorf("loadEnv() from %q set %s=%q, want %q", cwd, tt.wantKey, got, "loaded")
			}
		})
	}
}

// TestLoadEnv_MalformedEnvFile pins the behaviour when loadEnv finds a .env
// file that godotenv cannot parse: it must log the failure, leave the
// environment untouched (godotenv parses the whole file before setting
// anything, so even the well-formed lines above the bad one must not leak
// through), and return rather than continuing the walk upward to a valid
// .env further up the tree. That last part is the one a naive fix could get
// wrong: "found but broken" and "not found here" look similar unless the
// test checks that the walk actually stopped.
func TestLoadEnv_MalformedEnvFile(t *testing.T) {
	const (
		keyFromBrokenFile = "LOAD_ENV_TEST_GOOD_LINE"
		keyFromParentEnv  = "LOAD_ENV_TEST_PARENT_ENV"
	)
	for _, key := range []string{keyFromBrokenFile, keyFromParentEnv} {
		os.Unsetenv(key)
	}
	t.Cleanup(func() {
		for _, key := range []string{keyFromBrokenFile, keyFromParentEnv} {
			os.Unsetenv(key)
		}
	})

	root := t.TempDir()
	writeFile(t, filepath.Join(root, "go.mod"), "module fixture\n")
	// A valid .env sits above the working directory. If loadEnv fell back
	// to searching further up after a parse failure, this is what it would
	// find and load.
	writeFile(t, filepath.Join(root, ".env"), keyFromParentEnv+"=loaded\n")

	cwd := filepath.Join(root, "cmd", "app")
	// A syntactically invalid line ("bad line without equals!" has no "="
	// or ":" and a "!" outside the [A-Za-z0-9_.] godotenv accepts in a
	// variable name) fails the whole file, including the well-formed line
	// before it.
	writeFile(t, filepath.Join(cwd, ".env"), keyFromBrokenFile+"=good\nbad line without equals!\n")
	chdir(t, cwd)

	buf := captureLog(t)
	loadEnv()

	gotLog := buf.String()
	if !strings.Contains(gotLog, "could not load it") {
		t.Errorf("loadEnv() log output = %q, want it to report that the .env it found could not be loaded", gotLog)
	}

	if v, ok := os.LookupEnv(keyFromBrokenFile); ok {
		t.Errorf("loadEnv() set %s=%q from a .env that failed to parse, want no variables set from it (godotenv should reject the whole file, not apply the lines before the error)", keyFromBrokenFile, v)
	}
	if v, ok := os.LookupEnv(keyFromParentEnv); ok {
		t.Errorf("loadEnv() set %s=%q from the .env above the working directory, want the walk to stop at the broken file instead of falling back to search further up", keyFromParentEnv, v)
	}
}

// TestFileExists pins the file-vs-directory distinction fileExists exists
// to make. loadEnv treats a true result as "an .env file is here, load it",
// so a fileExists that answered true for a directory named .env would send
// godotenv.Load into a path it cannot read, breaking local dev with an
// error the directory-walk tests above wouldn't catch, since none of them
// use a directory named .env.
func TestFileExists(t *testing.T) {
	dir := t.TempDir()

	file := filepath.Join(dir, "present.txt")
	writeFile(t, file, "x")

	dirAsPath := filepath.Join(dir, "a-directory")
	if err := os.Mkdir(dirAsPath, 0o755); err != nil {
		t.Fatalf("Mkdir(%q): %v", dirAsPath, err)
	}

	tests := []struct {
		name string
		path string
		want bool
	}{
		{name: "file exists", path: file, want: true},
		{name: "file does not exist", path: filepath.Join(dir, "absent.txt"), want: false},
		{name: "path is a directory, not a file", path: dirAsPath, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := fileExists(tt.path); got != tt.want {
				t.Errorf("fileExists(%q) = %v, want %v", tt.path, got, tt.want)
			}
		})
	}
}
