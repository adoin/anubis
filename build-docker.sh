#!/bin/sh

make all
docker build -t anubis-ng:main .
docker tag anubis-ng:main cargo.skyunion.net/public/anubis:20251014
docker push cargo.skyunion.net/public/anubis:20251014
