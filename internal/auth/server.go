package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/mail"

	"github.com/Bethel-nz/feather/proto/feather/v1"
	"github.com/Bethel-nz/feather/internal/postgres"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const (
	minPasswordLen = 8
	// bcrypt silently truncates input beyond 72 bytes, so reject longer
	// passwords rather than letting the tail be ignored.
	maxPasswordLen = 72
)

func validateCredentials(email, password string) error {
	if _, err := mail.ParseAddress(email); err != nil {
		return status.Error(codes.InvalidArgument, "invalid email address")
	}
	if len(password) < minPasswordLen {
		return status.Errorf(codes.InvalidArgument, "password must be at least %d characters", minPasswordLen)
	}
	if len(password) > maxPasswordLen {
		return status.Errorf(codes.InvalidArgument, "password must be at most %d characters", maxPasswordLen)
	}
	return nil
}

type AuthServer struct {
	flagv1.UnimplementedAuthServiceServer
	q *postgres.Queries
}

func NewAuthServer(q *postgres.Queries) *AuthServer {
	return &AuthServer{q: q}
}

func (s *AuthServer) SignUp(ctx context.Context, req *flagv1.SignUpRequest) (*flagv1.AuthResponse, error) {
	if err := validateCredentials(req.Email, req.Password); err != nil {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to hash password")
	}

	user, err := s.q.CreateUser(ctx, postgres.CreateUserParams{
		Email:        req.Email,
		PasswordHash: string(hash),
	})
	if err != nil {
		return nil, status.Errorf(codes.AlreadyExists, "email already registered")
	}

	sdkKeyBytes := make([]byte, 32)
	if _, err := rand.Read(sdkKeyBytes); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate SDK key")
	}
	sdkKey := hex.EncodeToString(sdkKeyBytes)

	err = s.q.CreateProject(ctx, postgres.CreateProjectParams{
		OwnerID:    user.ID,
		Name:       "Default",
		SdkKeyHash: HashSDKKey(sdkKey),
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create project: %v", err)
	}

	uid := postgres.ToUUID(user.ID)
	token, expiresAt, err := GenerateToken(uid)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate token")
	}

	return &flagv1.AuthResponse{
		AccessToken: token,
		UserId:      uid.String(),
		SdkKey:      sdkKey,
		ExpiresAt:   timestamppb.New(expiresAt),
	}, nil
}

func (s *AuthServer) LogIn(ctx context.Context, req *flagv1.LogInRequest) (*flagv1.AuthResponse, error) {
	user, err := s.q.GetUserByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, status.Error(codes.Unauthenticated, "invalid email or password")
		}
		// A real failure (e.g. database unreachable) must not masquerade as
		// bad credentials — that mislabeling is what made this hard to debug.
		return nil, status.Errorf(codes.Internal, "login failed: %v", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "invalid email or password")
	}

	uid := postgres.ToUUID(user.ID)
	token, expiresAt, err := GenerateToken(uid)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate token")
	}

	// SDK key is only returned once at signup; LogIn does not rotate it.
	// Only the hashed key is stored, so the raw key is unrecoverable.
	return &flagv1.AuthResponse{
		AccessToken: token,
		UserId:      uid.String(),
		SdkKey:      "",
		ExpiresAt:   timestamppb.New(expiresAt),
	}, nil
}

func (s *AuthServer) ValidateToken(ctx context.Context, req *flagv1.ValidateTokenRequest) (*flagv1.ValidateTokenResponse, error) {
	claims, err := ValidateToken(req.AccessToken)
	if err != nil {
		return &flagv1.ValidateTokenResponse{Valid: false}, nil
	}
	return &flagv1.ValidateTokenResponse{
		Valid:  true,
		UserId: claims.UserID.String(),
	}, nil
}


