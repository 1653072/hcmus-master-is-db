package validator

import "regexp"

var phoneRegex = regexp.MustCompile(`^\+?[0-9]{7,15}$`)

// IsValidPhone checks if the given string is a valid international phone number.
func IsValidPhone(phone string) bool {
	return phoneRegex.MatchString(phone)
}
