FROM node:20-alpine

# we need to update npm to update cross-spawn to a version higher than or equal to 7.0.6 to avoid a critical vulnerability
RUN npm update -g npm
RUN apk add bash jq curl

COPY ./ /app/
WORKDIR /app/

RUN npm ci

# we use unsafe install because we have ignored all the test files to keep the image size small
# the test files are not needed in the production image
# therefore, please ensure that the tests are green before building the image
RUN npm run install-bin-unsafe

RUN mkdir /etc/connector/
WORKDIR /etc/connector/

LABEL org.opencontainers.image.source=https://github.com/hasura/ndc-promptql-programs
LABEL org.opencontainers.image.description="NDC Connector to invoke PromptQL Programs (Automations)"

ENTRYPOINT [ "ndc-promptql-programs" ]
