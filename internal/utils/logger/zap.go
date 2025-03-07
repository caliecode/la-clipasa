package logger

import (
	"github.com/laclipasa/la-clipasa/internal"
	"go.uber.org/zap"
)

func NewZap() (*zap.SugaredLogger, error) {
	cfg := internal.Config

	var err error

	var logger *zap.Logger
	switch cfg.AppEnv {
	case "prod":
		logger, err = zap.NewProduction()
	default:
		logger, err = zap.NewDevelopment()
	}
	if err != nil {
		return nil, internal.WrapErrorf(err, internal.ErrorCodeUnknown, "zap.New")
	}

	return logger.Sugar(), nil
}
