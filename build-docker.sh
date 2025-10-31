#!/bin/sh
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export GOBIN=$GOPATH/bin
export PATH=$PATH:$GOBIN
make all
CURRENT_DATE=$(date +%Y%m%d)
docker build -t anubis-ng:main .
docker tag anubis-ng:main cargo.skyunion.net/public/anubis:$CURRENT_DATE
docker push cargo.skyunion.net/public/anubis:$CURRENT_DATE
