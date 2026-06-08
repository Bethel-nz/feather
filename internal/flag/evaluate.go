package flag

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"
)

func EvaluateFlag(enabled bool, rolloutPercentage int16, flagKey, contextKey string) (bool, string) {
	if !enabled {
		return false, "flag disabled"
	}

	if rolloutPercentage >= 100 {
		return true, "100% rollout — everyone on"
	}

	if rolloutPercentage <= 0 {
		return false, "0% rollout — everyone off"
	}

	bucket := bucket(flagKey, contextKey, 100)
	inRollout := int16(bucket) < rolloutPercentage

	if inRollout {
		return true, fmt.Sprintf("in rollout bucket (%d < %d)", bucket, rolloutPercentage)
	}
	return false, fmt.Sprintf("out of rollout bucket (%d >= %d)", bucket, rolloutPercentage)
}

func bucket(flagKey, contextKey string, modulus int) int {
	h := sha256.Sum256([]byte(flagKey + ":" + contextKey))
	v := binary.BigEndian.Uint32(h[:4])
	return int(v % uint32(modulus))
}
