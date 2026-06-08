package postgres

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

func ParseUUID(s string) (pgtype.UUID, error) {
	u, err := uuid.Parse(s)
	if err != nil {
		return pgtype.UUID{}, err
	}
	return PgUUID(u), nil
}

func PgUUID(u uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: u, Valid: true}
}

func ToUUID(pu pgtype.UUID) uuid.UUID {
	return pu.Bytes
}

func MustParseUUID(s string) pgtype.UUID {
	u, err := uuid.Parse(s)
	if err != nil {
		panic(err)
	}
	return PgUUID(u)
}
