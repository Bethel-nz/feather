package flag

import (
	"context"
	"strings"

	"github.com/Bethel-nz/feather/internal/auth"
	"github.com/Bethel-nz/feather/internal/postgres"
	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type ctxKey string

const (
	ctxUserID    ctxKey = "user_id"
	ctxProjectID ctxKey = "project_id"
	ctxSDKKey    ctxKey = "sdk_key"
)

type Interceptor struct {
	q *postgres.Queries
}

func NewInterceptor(q *postgres.Queries) *Interceptor {
	return &Interceptor{q: q}
}

func (i *Interceptor) Unary() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Errorf(codes.Unauthenticated, "missing metadata")
		}

		authHeader := ""
		if vals := md.Get("authorization"); len(vals) > 0 {
			authHeader = vals[0]
		}

		if authHeader == "" {
			return nil, status.Errorf(codes.Unauthenticated, "missing authorization header")
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			return nil, status.Errorf(codes.Unauthenticated, "invalid authorization format")
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")

		if isManagementMethod(info.FullMethod) {
			claims, err := auth.ValidateToken(token)
			if err != nil {
				return nil, status.Errorf(codes.Unauthenticated, "invalid token: %v", err)
			}

			pgUserID, err := postgres.ParseUUID(claims.UserID.String())
			if err != nil {
				return nil, status.Errorf(codes.Internal, "invalid user ID")
			}

			project, err := i.q.GetProjectByOwnerID(ctx, pgUserID)
			if err != nil {
				return nil, status.Errorf(codes.NotFound, "no project found for user")
			}

			ctx = context.WithValue(ctx, ctxUserID, claims.UserID)
			ctx = context.WithValue(ctx, ctxProjectID, postgres.ToUUID(project.ID))
		} else if isEvaluationMethod(info.FullMethod) {
			sdkKeyHash := auth.HashSDKKey(token)

			project, err := i.q.GetProjectBySDKKeyHash(ctx, sdkKeyHash)
			if err != nil {
				return nil, status.Errorf(codes.Unauthenticated, "invalid SDK key")
			}

			ctx = context.WithValue(ctx, ctxProjectID, postgres.ToUUID(project.ID))
			ctx = context.WithValue(ctx, ctxSDKKey, token)
		} else {
			return nil, status.Errorf(codes.PermissionDenied, "unknown method: %s", info.FullMethod)
		}

		return handler(ctx, req)
	}
}

func UserIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	v, ok := ctx.Value(ctxUserID).(uuid.UUID)
	return v, ok
}

func ProjectIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	v, ok := ctx.Value(ctxProjectID).(uuid.UUID)
	return v, ok
}

var managementMethods = map[string]bool{
	"/feather.v1.FlagService/CreateFlag":     true,
	"/feather.v1.FlagService/ToggleFlag":     true,
	"/feather.v1.FlagService/UpdateRollout":  true,
	"/feather.v1.FlagService/ListFlags":      true,
	"/feather.v1.FlagService/DeleteFlag":     true,
}

var evaluationMethods = map[string]bool{
	"/feather.v1.FlagService/Evaluate": true,
}

func isManagementMethod(method string) bool {
	return managementMethods[method]
}

func isEvaluationMethod(method string) bool {
	return evaluationMethods[method]
}
