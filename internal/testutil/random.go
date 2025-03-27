package testutil

import (
	"fmt"
	"math/rand"
	"strings"
	"time"
)

var (
	seed int64      = time.Now().UnixNano() // Default to a random seed
	r    *rand.Rand = rand.New(rand.NewSource(seed))
)

// SetSeed sets the seed for the random number generator.
func SetSeed(s int64) {
	seed = s
	r = rand.New(rand.NewSource(seed))
}

const alphabet = "abcdefghijklmnopqrstuvwxyz"

// RandomInt64 generates a random int64 between min and max.
func RandomInt64(mi, ma int64) int64 {
	return mi + r.Int63n(ma-mi+1)
}

// RandomInt generates a random int between min and max.
func RandomInt(mi, ma int) int {
	return mi + r.Intn(ma-mi+1)
}

// RandomHEXColor generates a random color in hexadecimal format (#RRGGBB).
func RandomHEXColor() string {
	return fmt.Sprintf("#%02X%02X%02X", r.Intn(256), r.Intn(256), r.Intn(256))
}

// RandomBool generates a random boolean.
func RandomBool() bool {
	return []bool{true, false}[r.Intn(2)]
}

// RandomDate generates a random UTC date.
func RandomDate() time.Time {
	return time.Date(
		RandomInt(1971, 2022),
		time.Month(RandomInt64(1, 12)),
		RandomInt(1, 28),
		0, 0, 0, 0,
		time.UTC,
	)
}

// RandomLocalDate generates a random local date.
func RandomLocalDate() time.Time {
	return time.Date(
		RandomInt(1971, 2022),
		time.Month(RandomInt64(1, 12)),
		RandomInt(1, 28),
		0, 0, 0, 0,
		time.Local, // pgx decodes as local. Also must .Truncate(time.Microsecond) to compare pgx time.Time
	)
}

// RandomString generates a random string of length n.
func RandomString(n int) string {
	var sb strings.Builder
	k := len(alphabet)

	for i := 0; i < n; i++ {
		c := alphabet[r.Intn(k)]
		sb.WriteByte(c)
	}

	return sb.String()
}

// RandomName generates a random name.
func RandomName() string {
	return RandomNameIdentifier(1, "") + " " + RandomString(int(RandomInt64(10, 15)))
}

// RandomMoney generates a random amount of money.
func RandomMoney() int64 {
	return RandomInt64(0, 1000)
}

// RandomFirstName generates a random first name.
func RandomFirstName() string {
	return firstNames[r.Intn(len(firstNames))]
}

// RandomLastName generates a random last name.
func RandomLastName() string {
	return lastNames[r.Intn(len(lastNames))]
}

// RandomFrom selects a random item from a list. Assumes the list is not empty.
func RandomFrom[T any](items []T) T {
	index := r.Intn(len(items))
	return items[index]
}

// RandomNFrom selects n random items from a list. Assumes the list is not empty.
func RandomNFrom[T any](items []T, mi int, ma int) []T {
	count := RandomInt(mi, ma)
	var ss []T

	for i := 0; i < count; i++ {
		ss = append(ss, items[r.Intn(len(items))])
	}
	return ss
}

// RandomEmail generates a random email.
func RandomEmail() string {
	return RandomNameIdentifier(3, ".") + "@email.com"
}

// RandomNameIdentifier generates a random name identifier,
// such as eminently-sincere-mollusk-aksticpemgicjrtb.
// Prefix count is configurable via n.
func RandomNameIdentifier(n int, sep string) string {
	adv := adverbs[r.Intn(len(adverbs))]
	adj := adjectives[r.Intn(len(adjectives))]
	nam := names[r.Intn(len(names))]

	var ss []string
	switch n {
	case 1:
		ss = append(ss, nam)
	case 2:
		ss = append(ss, adj, nam)
	default:
		ss = append(ss, adv, adj, nam)
	}
	ss = append(ss, RandomString(16))

	return strings.Join(ss, sep)
}

// RandomLink generates a random link.
func RandomLink() string {
	return "https://example.com/" + RandomString(20)
}

// RandomLoremIpsum generates a random Lorem Ipsum paragraph.
func RandomLoremIpsum(mi, ma int) string {
	var ss []string
	for range RandomInt(mi, ma) {
		ss = append(ss, loremIpsum[r.Intn(len(loremIpsum))])
	}
	return strings.Join(ss, " ")
}

func RandomLoremIpsumParagraph() string {
	return RandomLoremIpsum(15, 50)
}
