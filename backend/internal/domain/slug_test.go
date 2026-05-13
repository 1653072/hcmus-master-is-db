package domain

import "testing"

func TestCanonicalSlug(t *testing.T) {
	tests := map[string]string{
		"Adventure Interesting": "adventure-interesting",
		"  Fantasy+++Modern  ":  "fantasy-modern",
		"Sách Thiếu Nhi":        "sach-thieu-nhi",
		"Crime & Mystery":       "crime-mystery",
		"---":                   "",
	}

	for input, want := range tests {
		if got := CanonicalSlug(input); got != want {
			t.Fatalf("CanonicalSlug(%q) = %q, want %q", input, got, want)
		}
	}
}
