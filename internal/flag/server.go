package flag

import (
	"context"
	"errors"

	"github.com/Bethel-nz/feather/proto/feather/v1"
	"github.com/Bethel-nz/feather/internal/postgres"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// isUniqueViolation reports whether err is a Postgres unique-constraint
// violation (SQLSTATE 23505).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// notFoundOrInternal maps a "no rows" result to NotFound and treats any other
// error as a genuine internal failure instead of masking it.
func notFoundOrInternal(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return status.Error(codes.NotFound, "flag not found")
	}
	return status.Errorf(codes.Internal, "database error: %v", err)
}

type FlagServer struct {
	flagv1.UnimplementedFlagServiceServer
	q *postgres.Queries
}

func NewFlagServer(q *postgres.Queries) *FlagServer {
	return &FlagServer{q: q}
}

func (s *FlagServer) CreateFlag(ctx context.Context, req *flagv1.CreateFlagRequest) (*flagv1.Flag, error) {
	projectID, ok := ProjectIDFromCtx(ctx)
	if !ok {
		return nil, status.Errorf(codes.Internal, "no project in context")
	}

	if req.RolloutPercentage > 100 {
		return nil, status.Errorf(codes.InvalidArgument, "rollout percentage must be between 0 and 100")
	}

	flag, err := s.q.CreateFlag(ctx, postgres.CreateFlagParams{
		ProjectID:         postgres.PgUUID(projectID),
		Key:               req.Key,
		Description:       req.Description,
		Enabled:           req.Enabled,
		RolloutPercentage: int16(req.RolloutPercentage),
	})
	if err != nil {
		if isUniqueViolation(err) {
			return nil, status.Errorf(codes.AlreadyExists, "flag key already exists")
		}
		return nil, status.Errorf(codes.Internal, "failed to create flag: %v", err)
	}

	return toProtoFlag(flag), nil
}

func (s *FlagServer) ToggleFlag(ctx context.Context, req *flagv1.ToggleFlagRequest) (*flagv1.Flag, error) {
	projectID, ok := ProjectIDFromCtx(ctx)
	if !ok {
		return nil, status.Errorf(codes.Internal, "no project in context")
	}

	flag, err := s.q.UpdateFlagEnabled(ctx, postgres.UpdateFlagEnabledParams{
		ProjectID: postgres.PgUUID(projectID),
		Key:       req.Key,
		Enabled:   req.Enabled,
	})
	if err != nil {
		return nil, notFoundOrInternal(err)
	}

	return toProtoFlag(flag), nil
}

func (s *FlagServer) UpdateRollout(ctx context.Context, req *flagv1.UpdateRolloutRequest) (*flagv1.Flag, error) {
	projectID, ok := ProjectIDFromCtx(ctx)
	if !ok {
		return nil, status.Errorf(codes.Internal, "no project in context")
	}

	if req.RolloutPercentage > 100 {
		return nil, status.Errorf(codes.InvalidArgument, "rollout percentage must be between 0 and 100")
	}

	flag, err := s.q.UpdateFlagRollout(ctx, postgres.UpdateFlagRolloutParams{
		ProjectID:         postgres.PgUUID(projectID),
		Key:               req.Key,
		RolloutPercentage: int16(req.RolloutPercentage),
	})
	if err != nil {
		return nil, notFoundOrInternal(err)
	}

	return toProtoFlag(flag), nil
}

func (s *FlagServer) ListFlags(ctx context.Context, req *flagv1.ListFlagsRequest) (*flagv1.ListFlagsResponse, error) {
	projectID, ok := ProjectIDFromCtx(ctx)
	if !ok {
		return nil, status.Errorf(codes.Internal, "no project in context")
	}

	flags, err := s.q.ListFlagsByProject(ctx, postgres.PgUUID(projectID))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list flags: %v", err)
	}

	protoFlags := make([]*flagv1.Flag, len(flags))
	for i, f := range flags {
		protoFlags[i] = toProtoFlag(f)
	}

	return &flagv1.ListFlagsResponse{Flags: protoFlags}, nil
}

func (s *FlagServer) DeleteFlag(ctx context.Context, req *flagv1.DeleteFlagRequest) (*flagv1.DeleteFlagResponse, error) {
	projectID, ok := ProjectIDFromCtx(ctx)
	if !ok {
		return nil, status.Errorf(codes.Internal, "no project in context")
	}

	n, err := s.q.DeleteFlagByKey(ctx, postgres.DeleteFlagByKeyParams{
		ProjectID: postgres.PgUUID(projectID),
		Key:       req.Key,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete flag: %v", err)
	}

	return &flagv1.DeleteFlagResponse{Deleted: n > 0}, nil
}

func (s *FlagServer) Evaluate(ctx context.Context, req *flagv1.EvaluateRequest) (*flagv1.EvaluateResponse, error) {
	projectID, ok := ProjectIDFromCtx(ctx)
	if !ok {
		return nil, status.Errorf(codes.Internal, "no project in context")
	}

	dbFlag, err := s.q.GetFlagByKey(ctx, postgres.GetFlagByKeyParams{
		ProjectID: postgres.PgUUID(projectID),
		Key:       req.Key,
	})
	if err != nil {
		return &flagv1.EvaluateResponse{
			Enabled: false,
			Reason:  "flag not found",
		}, nil
	}

	enabled, reason := EvaluateFlag(dbFlag.Enabled, dbFlag.RolloutPercentage, req.Key, req.ContextKey)
	return &flagv1.EvaluateResponse{
		Enabled: enabled,
		Reason:  reason,
	}, nil
}

func toProtoFlag(f postgres.Flag) *flagv1.Flag {
	return &flagv1.Flag{
		Key:               f.Key,
		Description:       f.Description,
		Enabled:           f.Enabled,
		RolloutPercentage: uint32(f.RolloutPercentage),
		CreatedAt:         timestamppb.New(f.CreatedAt.Time),
		UpdatedAt:         timestamppb.New(f.UpdatedAt.Time),
	}
}

