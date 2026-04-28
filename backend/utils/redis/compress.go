package redisutil

import (
	"fmt"

	"github.com/golang/snappy"
)

// Encode compresses data using Snappy before storing in Redis.
// Returns the compressed byte slice.
func Encode(data []byte) []byte {
	return snappy.Encode(nil, data)
}

// Decode decompresses a Snappy-compressed byte slice read from Redis.
// Returns an error if the data is not valid Snappy-compressed content.
func Decode(data []byte) ([]byte, error) {
	decoded, err := snappy.Decode(nil, data)
	if err != nil {
		return nil, fmt.Errorf("snappy decode: %w", err)
	}
	return decoded, nil
}
