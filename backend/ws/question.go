package ws

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"time"
)

type RawQuestion struct {
	ID     string `json:"id"`
	Answer string `json:"answer"`
}

type Question struct {
	ID      string   `json:"id"`
	Options []string `json:"options"`
	Answer  string   `json:"answer"`
}

// LoadRawQuestions reads simplified question definitions from JSON file
func LoadRawQuestions(filename string) ([]RawQuestion, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}
	var raw []RawQuestion
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}
	return raw, nil
}

// GenerateQuestions creates full Questions with 4 options (1 correct + 3 random wrong)
func GenerateQuestions(raw []RawQuestion, count int) []Question {
	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(raw), func(i, j int) { raw[i], raw[j] = raw[j], raw[i] })

	if count > len(raw) {
		count = len(raw)
	}

	var questions []Question
	allAnswers := extractAllAnswers(raw)

	for i := 0; i < count; i++ {
		correct := raw[i].Answer
		wrong := randomOthers(correct, allAnswers, 3)
		options := append(wrong, correct)

		// shuffle options
		rand.Shuffle(len(options), func(i, j int) {
			options[i], options[j] = options[j], options[i]
		})

		questions = append(questions, Question{
			ID:      raw[i].ID,
			Options: options,
			Answer:  correct,
		})
	}

	return questions
}

// extract all answer strings from raw
func extractAllAnswers(raw []RawQuestion) []string {
	answers := make([]string, len(raw))
	for i, q := range raw {
		answers[i] = q.Answer
	}
	return answers
}

// randomOthers picks N unique wrong answers excluding the correct one
func randomOthers(correct string, pool []string, n int) []string {
	filtered := []string{}
	for _, a := range pool {
		if a != correct {
			filtered = append(filtered, a)
		}
	}
	rand.Shuffle(len(filtered), func(i, j int) { filtered[i], filtered[j] = filtered[j], filtered[i] })

	if n > len(filtered) {
		n = len(filtered)
	}
	return filtered[:n]
}
