package store

import (
"bytes"
"context"
"crypto/sha256"
"encoding/hex"
"fmt"
"io"
"os"
"path/filepath"

"github.com/aws/aws-sdk-go-v2/aws"
"github.com/aws/aws-sdk-go-v2/config"
"github.com/aws/aws-sdk-go-v2/credentials"
"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Store struct {
Client *s3.Client
Bucket string
Prefix string
}

type S3Config struct {
Endpoint        string
Region          string
AccessKeyID     string
SecretAccessKey string
Bucket          string
Prefix          string
}

func NewS3FromEnv() (*S3Store, error) {
cfg := S3Config{
Endpoint:        os.Getenv("CONTACTOS_S3_ENDPOINT"),
Region:          os.Getenv("CONTACTOS_S3_REGION"),
AccessKeyID:     os.Getenv("CONTACTOS_S3_ACCESS_KEY_ID"),
SecretAccessKey: os.Getenv("CONTACTOS_S3_SECRET_ACCESS_KEY"),
Bucket:          os.Getenv("CONTACTOS_S3_BUCKET"),
Prefix:          os.Getenv("CONTACTOS_S3_PREFIX"),
}

if cfg.Bucket == "" || cfg.AccessKeyID == "" || cfg.SecretAccessKey == "" {
return nil, fmt.Errorf("missing required CONTACTOS_S3_* env vars")
}

loadOpts := []func(*config.LoadOptions) error{
config.WithRegion(cfg.Region),
config.WithCredentialsProvider(
credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
),
}

if cfg.Endpoint != "" {
loadOpts = append(loadOpts, config.WithEndpointResolverWithOptions(
aws.EndpointResolverWithOptionsFunc(func(service, region string, _ ...interface{}) (aws.Endpoint, error) {
return aws.Endpoint{URL: cfg.Endpoint, HostnameImmutable: true}, nil
}),
))
}

awsCfg, err := config.LoadDefaultConfig(context.Background(), loadOpts...)
if err != nil {
return nil, err
}

client := s3.NewFromConfig(awsCfg)
return &S3Store{Client: client, Bucket: cfg.Bucket, Prefix: cfg.Prefix}, nil
}

func (s *S3Store) key(executionID, relativePath string) string {
if s.Prefix != "" {
return filepath.ToSlash(filepath.Join(s.Prefix, executionID, relativePath))
}
return filepath.ToSlash(filepath.Join(executionID, relativePath))
}

func (s *S3Store) PutBytes(ctx context.Context, executionID, relativePath string, b []byte) (PutResult, error) {
sum := sha256.Sum256(b)
key := s.key(executionID, relativePath)

_, err := s.Client.PutObject(ctx, &s3.PutObjectInput{
Bucket: &s.Bucket,
Key:    &key,
Body:   bytes.NewReader(b),
})
if err != nil {
return PutResult{}, err
}

uri := fmt.Sprintf("s3://%s/%s", s.Bucket, key)
return PutResult{
URI:    uri,
Bytes:  int64(len(b)),
SHA256: hex.EncodeToString(sum[:]),
}, nil
}

func (s *S3Store) PutFile(ctx context.Context, executionID, relativePath, srcPath string) (PutResult, error) {
key := s.key(executionID, relativePath)

f, err := os.Open(srcPath)
if err != nil {
return PutResult{}, err
}
defer f.Close()

h := sha256.New()
body := io.TeeReader(f, h)

_, err = s.Client.PutObject(ctx, &s3.PutObjectInput{
Bucket: &s.Bucket,
Key:    &key,
Body:   body,
})
if err != nil {
return PutResult{}, err
}

st, err := os.Stat(srcPath)
if err != nil {
return PutResult{}, err
}

uri := fmt.Sprintf("s3://%s/%s", s.Bucket, key)
return PutResult{
URI:    uri,
Bytes:  st.Size(),
SHA256: hex.EncodeToString(h.Sum(nil)),
}, nil
}
