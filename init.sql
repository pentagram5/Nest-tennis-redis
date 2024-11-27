-- 데이터베이스가 존재하지 않을 경우에만 생성

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS coaches
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL unique,
    created_at TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP        DEFAULT CURRENT_TIMESTAMP
);

-- 초기 데이터 삽입 (중복 삽입 방지를 위해 UPSERT 사용 가능)
INSERT INTO coaches (name)
VALUES ('김민준'),
       ('오서준'),
       ('이도윤'),
       ('박예준');

