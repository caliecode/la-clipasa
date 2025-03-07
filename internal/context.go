package internal

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/gin-gonic/gin"
	"github.com/zitadel/oidc/v3/pkg/oidc"
	"go.uber.org/zap"
)

type ctxKeyLogger struct{}

func GetLoggerFromCtx(ctx context.Context) *zap.SugaredLogger {
	l, ok := ctx.Value(ctxKeyLogger{}).(*zap.SugaredLogger)
	if !ok {
		return nil
	}
	return l
}

func SetLoggerCtx(ctx context.Context, l *zap.SugaredLogger) context.Context {
	return context.WithValue(ctx, ctxKeyLogger{}, l)
}

const (
	ctxKeyPrefix   = "rest-"
	userInfoCtxKey = ctxKeyPrefix + "user-info"
	userCtxKey     = ctxKeyPrefix + "user"
)

type CtxGinKey = struct{}

func GetUserInfoFromCtx(c *gin.Context) (*oidc.UserInfo, error) {
	userInfoBlob, ok := c.Value(userInfoCtxKey).([]byte)
	if !ok {
		return nil, errors.New("empty value")
	}
	var userInfo oidc.UserInfo
	err := json.Unmarshal(userInfoBlob, &userInfo)
	if err != nil {
		return nil, fmt.Errorf("could not load user info: %w", err)
	}

	return &userInfo, nil
}

func CtxWithUserInfo(c *gin.Context, userinfo []byte) {
	c.Set(userInfoCtxKey, userinfo)
}

type ctxKeyUser struct{}

func GetUserFromCtx(ctx context.Context) *generated.User {
	u, ok := ctx.Value(ctxKeyUser{}).(*generated.User)
	if !ok {
		return nil
	}
	return u
}

func SetUserCtx(ctx context.Context, u *generated.User) context.Context {
	return context.WithValue(ctx, ctxKeyUser{}, u)
}
