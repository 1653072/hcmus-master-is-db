package main

import (
	"context"
	"flag"
	"fmt"
	"hash/fnv"
	"html"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type bookRecord struct {
	ID       any          `bson:"_id"`
	Name     string       `bson:"name"`
	Category bookCategory `bson:"category"`
	Authors  []bookAuthor `bson:"authors"`
	Images   []bookImage  `bson:"images"`
}

type bookCategory struct {
	CategoryID string `bson:"categoryId"`
}

type bookAuthor struct {
	AuthorName string `bson:"authorName"`
}

type bookImage struct {
	URL string `bson:"url"`
}

type coverPalette struct {
	BG     string
	Paper  string
	Accent string
	Dark   string
	Mid    string
	Soft   string
}

var coverPalettes = []coverPalette{
	{BG: "#F4EFE7", Paper: "#FFFDF8", Accent: "#C85A32", Dark: "#2B211B", Mid: "#7A5A46", Soft: "#E3D5C6"},
	{BG: "#EDF3EE", Paper: "#FEFFF9", Accent: "#4F7F58", Dark: "#1F2A24", Mid: "#607366", Soft: "#CEDCCF"},
	{BG: "#EEF2F7", Paper: "#FFFFFF", Accent: "#315F8C", Dark: "#1E2733", Mid: "#5F7084", Soft: "#CFDAE6"},
	{BG: "#F6EEE9", Paper: "#FFFDFB", Accent: "#9F4E5E", Dark: "#2A2024", Mid: "#775C63", Soft: "#E7D2D7"},
	{BG: "#F3F0E6", Paper: "#FFFFFA", Accent: "#B9842F", Dark: "#2A251D", Mid: "#74684F", Soft: "#E3D9C0"},
	{BG: "#ECEBE7", Paper: "#FFFDF6", Accent: "#5D6170", Dark: "#22242B", Mid: "#6E7078", Soft: "#DAD8D1"},
}

func main() {
	force := flag.Bool("force", false, "Regenerate covers for every book, including books that already have non-picsum images.")
	dryRun := flag.Bool("dry-run", false, "Generate no files and update no MongoDB documents; print what would change.")
	limit := flag.Int("limit", 0, "Maximum number of books to update. Zero means no limit.")
	outputDirFlag := flag.String("output", defaultOutputDir(), "Directory where generated cover SVG files are written.")
	publicPrefix := flag.String("public-prefix", "/assets/book-covers", "Public URL prefix stored in MongoDB images.url.")
	flag.Parse()

	loadEnv()

	dbName := envOrDefault("MONGO_DB", "bookstore")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI(dbName)))
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		_ = client.Disconnect(context.Background())
	}()

	coll := client.Database(dbName).Collection("books")
	cursor, err := coll.Find(ctx, bson.M{})
	if err != nil {
		log.Fatal(err)
	}
	defer cursor.Close(ctx)

	outputDir := filepath.Clean(*outputDirFlag)
	if !*dryRun {
		if err := os.MkdirAll(outputDir, 0755); err != nil {
			log.Fatalf("create output directory: %v", err)
		}
	}

	updated := 0
	skipped := 0

	for cursor.Next(ctx) {
		if *limit > 0 && updated >= *limit {
			break
		}

		var book bookRecord
		if err := cursor.Decode(&book); err != nil {
			log.Fatal(err)
		}

		if !shouldUpdate(book.Images, *force) {
			skipped++
			continue
		}

		id := mongoIDString(book.ID)
		if id == "" {
			skipped++
			continue
		}

		filename := safeFileName(id) + ".svg"
		publicURL := strings.TrimRight(*publicPrefix, "/") + "/" + filename
		svg := renderCoverSVG(book, id)

		if *dryRun {
			fmt.Printf("Would generate %s and set %s -> %s\n", filepath.Join(outputDir, filename), id, publicURL)
			updated++
			continue
		}

		if err := os.WriteFile(filepath.Join(outputDir, filename), []byte(svg), 0644); err != nil {
			log.Fatalf("write cover for %s: %v", id, err)
		}

		update := bson.M{
			"$set": bson.M{
				"images": []bson.M{
					{
						"isPrimary": true,
						"alt":       fallbackTitle(book.Name),
						"url":       publicURL,
					},
				},
			},
		}

		if _, err := coll.UpdateOne(ctx, bson.M{"_id": book.ID}, update); err != nil {
			log.Fatalf("update MongoDB book %s: %v", id, err)
		}

		updated++
	}

	if err := cursor.Err(); err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Generated covers for %d book(s), skipped %d existing image(s). Output: %s\n", updated, skipped, outputDir)
}

func loadEnv() {
	for _, path := range []string{"backend/.env", ".env", "../.env"} {
		if _, err := os.Stat(path); err == nil {
			_ = godotenv.Load(path)
			return
		}
	}
}

func mongoURI(dbName string) string {
	if uri := os.Getenv("MONGO_URI"); uri != "" {
		return uri
	}

	user := envOrDefault("MONGO_USER", "developer")
	pass := envOrDefault("MONGO_PASSWORD", "devpassword")
	host := envOrDefault("MONGO_HOST", "localhost")
	port := envOrDefault("MONGO_PORT", "27017")
	return fmt.Sprintf("mongodb://%s:%s@%s:%s/%s?authSource=admin", user, pass, host, port, dbName)
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func shouldUpdate(images []bookImage, force bool) bool {
	if force || len(images) == 0 {
		return true
	}
	for _, image := range images {
		url := strings.TrimSpace(image.URL)
		if url == "" || strings.Contains(url, "picsum.photos") {
			return true
		}
		return false
	}
	return true
}

func defaultOutputDir() string {
	candidates := []string{
		"../frontend/public/assets/book-covers",
		"frontend/public/assets/book-covers",
	}
	for _, candidate := range candidates {
		if _, err := os.Stat(filepath.Dir(candidate)); err == nil {
			return candidate
		}
	}
	return "../frontend/public/assets/book-covers"
}

func mongoIDString(id any) string {
	switch value := id.(type) {
	case string:
		return value
	case primitive.ObjectID:
		return value.Hex()
	default:
		return strings.TrimSpace(fmt.Sprint(value))
	}
}

func safeFileName(value string) string {
	var builder strings.Builder
	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z':
			builder.WriteRune(r)
		case r >= 'A' && r <= 'Z':
			builder.WriteRune(r)
		case r >= '0' && r <= '9':
			builder.WriteRune(r)
		case r == '-' || r == '_':
			builder.WriteRune(r)
		default:
			builder.WriteByte('-')
		}
	}
	if builder.Len() == 0 {
		return "book"
	}
	return builder.String()
}

func renderCoverSVG(book bookRecord, id string) string {
	hash := hashString(id + book.Name + book.Category.CategoryID)
	palette := coverPalettes[int(hash)%len(coverPalettes)]
	title := fallbackTitle(book.Name)
	author := firstAuthor(book.Authors)
	titleLines := wrapText(strings.ToUpper(title), 13, 7)
	initial := strings.ToUpper(string([]rune(title)[0]))

	titleFontSize := 31
	lineHeight := 38
	if len(titleLines) >= 4 {
		titleFontSize = 27
		lineHeight = 34
	}
	if len(titleLines) >= 6 {
		titleFontSize = 24
		lineHeight = 30
	}

	var titleBlock strings.Builder
	startY := 210
	for i, line := range titleLines {
		fmt.Fprintf(
			&titleBlock,
			`<text x="64" y="%d" font-size="%d" font-weight="700" fill="%s">%s</text>`,
			startY+(i*lineHeight),
			titleFontSize,
			palette.Dark,
			escapeXML(line),
		)
	}

	accentShift := int(hash % 70)

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" role="img" aria-label="%s">
  <rect width="400" height="600" fill="%s"/>
  <rect x="32" y="34" width="336" height="532" rx="24" fill="%s" stroke="%s" stroke-width="2"/>
  <path d="M32 122 C105 %d 171 %d 368 84 L368 34 L32 34 Z" fill="%s" opacity="0.18"/>
  <rect x="54" y="58" width="292" height="68" rx="14" fill="%s" opacity="0.10"/>
  <text x="64" y="86" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700" fill="%s">PAPER HAVEN</text>
  <text x="64" y="108" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="600" fill="%s">BOOKSTORE EDITION</text>
  <circle cx="306" cy="91" r="25" fill="%s"/>
  <text x="306" y="101" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800" fill="%s">%s</text>
  <line x1="64" y1="164" x2="336" y2="164" stroke="%s" stroke-width="2"/>
  <g font-family="Inter, Arial, sans-serif">%s</g>
  <text x="64" y="498" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="600" fill="%s">%s</text>
  <rect x="64" y="522" width="118" height="6" rx="3" fill="%s"/>
  <rect x="64" y="538" width="178" height="6" rx="3" fill="%s" opacity="0.55"/>
  <path d="M314 548 L346 548 L346 516" fill="none" stroke="%s" stroke-width="7" stroke-linecap="round"/>
</svg>
`,
		escapeXML(title),
		palette.BG,
		palette.Paper,
		palette.Soft,
		150+accentShift,
		56+accentShift,
		palette.Accent,
		palette.Accent,
		palette.Accent,
		palette.Mid,
		palette.Accent,
		palette.Paper,
		escapeXML(initial),
		palette.Soft,
		titleBlock.String(),
		palette.Mid,
		escapeXML(trimText(author, 26)),
		palette.Accent,
		palette.Soft,
		palette.Accent,
	)
}

func fallbackTitle(title string) string {
	title = strings.TrimSpace(title)
	if title == "" {
		return "Untitled Book"
	}
	return title
}

func firstAuthor(authors []bookAuthor) string {
	for _, author := range authors {
		if name := strings.TrimSpace(author.AuthorName); name != "" {
			return name
		}
	}
	return "Paper Haven"
}

func wrapText(text string, maxRunesPerLine int, maxLines int) []string {
	words := strings.Fields(text)
	if len(words) == 0 {
		return []string{"UNTITLED BOOK"}
	}

	var lines []string
	current := ""
	for _, word := range words {
		for _, part := range splitLongWord(word, maxRunesPerLine) {
			next := part
			if current != "" {
				next = current + " " + part
			}
			if runeLen(next) <= maxRunesPerLine {
				current = next
				continue
			}
			if current != "" {
				lines = append(lines, current)
			}
			current = part
		}
	}
	if current != "" {
		lines = append(lines, current)
	}

	if len(lines) > maxLines {
		lines = lines[:maxLines]
		lines[maxLines-1] = trimRunes(lines[maxLines-1], maxRunesPerLine-3) + "..."
	}

	return lines
}

func splitLongWord(word string, maxRunes int) []string {
	if runeLen(word) <= maxRunes {
		return []string{word}
	}

	var parts []string
	runes := []rune(word)
	for len(runes) > maxRunes {
		parts = append(parts, string(runes[:maxRunes]))
		runes = runes[maxRunes:]
	}
	if len(runes) > 0 {
		parts = append(parts, string(runes))
	}
	return parts
}

func runeLen(value string) int {
	return len([]rune(value))
}

func trimRunes(value string, maxRunes int) string {
	runes := []rune(value)
	if len(runes) <= maxRunes {
		return value
	}
	return string(runes[:maxRunes])
}

func trimText(value string, maxRunes int) string {
	value = strings.TrimSpace(value)
	if runeLen(value) <= maxRunes {
		return value
	}
	return strings.TrimSpace(trimRunes(value, maxRunes-3)) + "..."
}

func hashString(value string) uint32 {
	h := fnv.New32a()
	_, _ = h.Write([]byte(value))
	return h.Sum32()
}

func escapeXML(value string) string {
	return html.EscapeString(value)
}
