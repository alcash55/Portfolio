package ciactions

import (
	"slices"
	"strings"
	"testing"
)

func treeOf(paths ...string) githubTree {
	entries := make([]treeEntry, 0, len(paths))
	for _, p := range paths {
		entries = append(entries, treeEntry{Path: p, Type: "blob"})
	}
	return githubTree{Tree: entries}
}

func names(files []actionFile) []string {
	out := make([]string, 0, len(files))
	for _, f := range files {
		out = append(out, f.name)
	}
	return out
}

// Ported from the retired frontend generate-ci-actions script tests.
func TestActionPaths_NamesAnActionByTheFolderHoldingItsActionYml(t *testing.T) {
	got, err := actionPaths(treeOf(
		"README.md",
		"diff/action.yml",
		"diff/index.js",
		"security/betterleaks/action.yml",
		"security/betterleaks/comment/action.yaml",
		"package.json",
	))
	if err != nil {
		t.Fatalf("actionPaths: %v", err)
	}
	want := []string{"diff", "security/betterleaks", "security/betterleaks/comment"}
	if !slices.Equal(names(got), want) {
		t.Errorf("action names = %v, want %v", names(got), want)
	}
}

func TestActionPaths_KeepsTheFilePathSoActionYamlCanBeFetched(t *testing.T) {
	got, _ := actionPaths(treeOf("a/action.yaml"))
	if len(got) != 1 || got[0].file != "a/action.yaml" {
		t.Errorf("actionPaths = %+v, want one action whose file is a/action.yaml", got)
	}
}

func TestActionPaths_SortsByName(t *testing.T) {
	got, _ := actionPaths(treeOf("zeta/action.yml", "alpha/action.yml", "mid/action.yml"))
	want := []string{"alpha", "mid", "zeta"}
	if !slices.Equal(names(got), want) {
		t.Errorf("action names = %v, want %v", names(got), want)
	}
}

func TestActionPaths_IgnoresFixturesAndToolingFolders(t *testing.T) {
	got, _ := actionPaths(treeOf(
		"diff/action.yml",
		"node_modules/x/action.yml",
		".github/a/action.yml",
		".playwright-cli/action.yml",
		"diff/test/action.yml",
		"tests/action.yml",
		"fixtures/y/action.yml",
	))
	if !slices.Equal(names(got), []string{"diff"}) {
		t.Errorf("action names = %v, want only [diff]", names(got))
	}
}

func TestActionPaths_SkipsTheRootActionFile(t *testing.T) {
	// A bare action.yml at the repo root has no folder to name it by.
	got, _ := actionPaths(treeOf("action.yml", "diff/action.yml"))
	if !slices.Equal(names(got), []string{"diff"}) {
		t.Errorf("action names = %v, want only [diff]", names(got))
	}
}

func TestActionPaths_KeepsAFolderWhoseNameOnlyContainsASkippedWord(t *testing.T) {
	got, _ := actionPaths(treeOf("testing/action.yml", "latest/action.yml"))
	if !slices.Equal(names(got), []string{"latest", "testing"}) {
		t.Errorf("action names = %v, want [latest testing]", names(got))
	}
}

func TestActionPaths_ListsAFolderOnceWhenItHoldsBothSpellings(t *testing.T) {
	got, _ := actionPaths(treeOf("a/action.yaml", "a/action.yml"))
	if len(got) != 1 || got[0].file != "a/action.yml" {
		t.Errorf("actionPaths = %+v, want one action reading a/action.yml", got)
	}
}

func TestActionPaths_RejectsAResponseThatIsNotATree(t *testing.T) {
	// GitHub answers a rate limit with 200-looking JSON in some paths; an error
	// page must never turn into a count of zero actions.
	_, err := actionPaths(githubTree{})
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "tree") {
		t.Errorf("actionPaths(no tree) error = %v, want one mentioning the tree", err)
	}
}

func TestFirstSentence(t *testing.T) {
	tests := []struct{ name, in, want string }{
		{
			name: "takes the first sentence of a folded description",
			in:   "List the files changed in a pull request, split into\n  files that can be processed.\n  And more.",
			want: "List the files changed in a pull request, split into files that can be processed.",
		},
		{name: "returns the whole text when no sentence ends", in: "Send notifications through github and discord", want: "Send notifications through github and discord"},
		{name: "does not end on a dot inside a word", in: "Needs v1.2 or later. Then more.", want: "Needs v1.2 or later."},
		{name: "ends on a question mark", in: "Is it done? Yes.", want: "Is it done?"},
		{name: "empty stays empty", in: "  \n ", want: ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := firstSentence(tt.in); got != tt.want {
				t.Errorf("firstSentence(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestDescriptionOf(t *testing.T) {
	tests := []struct{ name, yaml, want string }{
		{name: "plain value", yaml: "name: x\ndescription: Does a thing. More.\n", want: "Does a thing. More."},
		{name: "double quoted", yaml: "description: \"Hello world\"\n", want: "Hello world"},
		{name: "single quoted", yaml: "description: 'Hello world'\n", want: "Hello world"},
		{
			name: "folded block ends at the next top-level key",
			yaml: "description: >\n  Line one\n  line two.\ninputs:\n  x:\n    description: nope\n",
			want: "Line one line two.",
		},
		{name: "literal block with strip indicator", yaml: "description: |-\n  First.\n  Second.\nruns:\n", want: "First. Second."},
		{name: "windows line endings", yaml: "name: x\r\ndescription: Hi there.\r\nruns:\r\n", want: "Hi there."},
		{name: "ignores a nested description", yaml: "inputs:\n  x:\n    description: nope\n", want: ""},
		{name: "no description", yaml: "name: x\n", want: ""},
		{name: "empty file", yaml: "", want: ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := descriptionOf(tt.yaml); got != tt.want {
				t.Errorf("descriptionOf(%q) = %q, want %q", tt.yaml, got, tt.want)
			}
		})
	}
}
