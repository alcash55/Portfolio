package ciactions

import (
	"errors"
	"regexp"
	"sort"
	"strings"
	"unicode"
)

// githubTree is the subset of GitHub's git tree response this handler reads.
// Tree stays nil when the body was not a tree at all (an error object), which
// is how actionPaths tells that apart from a real tree with no entries.
type githubTree struct {
	SHA  string      `json:"sha"`
	Tree []treeEntry `json:"tree"`
}

type treeEntry struct {
	Path string `json:"path"`
	Type string `json:"type"`
}

// actionFile is one action in the repo: name is the folder as it is written
// in a `uses:` line, file is the path of the YAML that holds its metadata.
type actionFile struct {
	name string
	file string
}

var (
	actionFileRe = regexp.MustCompile(`^(?:(.+)/)?action\.ya?ml$`)
	// Folders that hold test fixtures or tooling, never a published action.
	skippedPart = regexp.MustCompile(`^(node_modules|\.github|\.playwright-cli|test|tests|fixtures)$`)

	errNotATree = errors.New("GitHub did not return a tree")
)

// actionPaths lists the folders that hold an action.yml (or action.yaml), in
// name order. An action.yml at the repo root has no folder to name it by, so
// it is skipped. When a folder holds both spellings, action.yml wins.
func actionPaths(tree githubTree) ([]actionFile, error) {
	if tree.Tree == nil {
		return nil, errNotATree
	}

	byName := map[string]string{}
	for _, entry := range tree.Tree {
		match := actionFileRe.FindStringSubmatch(entry.Path)
		if match == nil || match[1] == "" || hasSkippedPart(match[1]) {
			continue
		}
		if existing, seen := byName[match[1]]; seen && strings.HasSuffix(existing, ".yml") {
			continue
		}
		byName[match[1]] = entry.Path
	}

	files := make([]actionFile, 0, len(byName))
	for name, file := range byName {
		files = append(files, actionFile{name: name, file: file})
	}
	sort.Slice(files, func(i, j int) bool { return files[i].name < files[j].name })
	return files, nil
}

func hasSkippedPart(folder string) bool {
	for _, part := range strings.Split(folder, "/") {
		if skippedPart.MatchString(part) {
			return true
		}
	}
	return false
}

var sentenceEnd = regexp.MustCompile(`[.!?](\s|$)`)

// firstSentence returns the first sentence of a YAML description, with
// folded lines joined.
func firstSentence(text string) string {
	flat := strings.Join(strings.Fields(text), " ")
	loc := sentenceEnd.FindStringIndex(flat)
	if loc == nil {
		return flat
	}
	return flat[:loc[0]+1]
}

var (
	descriptionKey = regexp.MustCompile(`^description:\s*`)
	blockScalar    = regexp.MustCompile(`^[|>][+-]?$`)
	edgeQuotes     = regexp.MustCompile(`^['"]|['"]$`)
)

// descriptionOf reads the top-level description from an action.yml without a
// YAML parser: a plain or quoted value on the same line, or a | or > block
// that runs until the next unindented line. Only a column-0 key counts, so
// the description of an input never wins over the action's own.
func descriptionOf(yaml string) string {
	lines := strings.Split(yaml, "\n")
	at := -1
	for i, line := range lines {
		if strings.HasPrefix(line, "description:") {
			at = i
			break
		}
	}
	if at == -1 {
		return ""
	}

	first := strings.TrimSpace(descriptionKey.ReplaceAllString(lines[at], ""))
	if !blockScalar.MatchString(first) {
		return edgeQuotes.ReplaceAllString(first, "")
	}

	var block []string
	for _, line := range lines[at+1:] {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" && !startsWithSpace(line) {
			break
		}
		block = append(block, trimmed)
	}
	return strings.TrimSpace(strings.Join(block, " "))
}

func startsWithSpace(s string) bool {
	for _, r := range s {
		return unicode.IsSpace(r)
	}
	return false
}
