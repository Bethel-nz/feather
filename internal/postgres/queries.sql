-- name: CreateUser :one
INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: CreateProject :exec
INSERT INTO projects (owner_id, name, sdk_key_hash) VALUES ($1, $2, $3);

-- name: GetProjectBySDKKeyHash :one
SELECT * FROM projects WHERE sdk_key_hash = $1;

-- name: GetProjectByOwnerID :one
SELECT * FROM projects WHERE owner_id = $1;

-- name: GetFirstProject :one
SELECT * FROM projects ORDER BY created_at ASC LIMIT 1;

-- name: CreateFlag :one
INSERT INTO flags (project_id, key, description, enabled, rollout_percentage)
VALUES ($1, $2, $3, $4, $5) RETURNING *;

-- name: GetFlagByKey :one
SELECT * FROM flags WHERE project_id = $1 AND key = $2;

-- name: ListFlagsByProject :many
SELECT * FROM flags WHERE project_id = $1 ORDER BY created_at DESC;

-- name: UpdateFlagEnabled :one
UPDATE flags SET enabled = $1, updated_at = now() WHERE project_id = $2 AND key = $3 RETURNING *;

-- name: UpdateFlagRollout :one
UPDATE flags SET rollout_percentage = $1, updated_at = now() WHERE project_id = $2 AND key = $3 RETURNING *;

-- name: UpdateProjectSDKKey :exec
UPDATE projects SET sdk_key_hash = $1 WHERE id = $2;

-- name: DeleteFlagByKey :execrows
DELETE FROM flags WHERE project_id = $1 AND key = $2;
