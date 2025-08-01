# NDC PromptQL Programs Connector
This connector allows you to invoke PromptQL Programs (Automations) as commands. 

# Current Limitations
- The connector is not yet published to NDC hub. So Cloud builds will not work. Local usage with PromptQL playground is supported.

# How to use
- Build the DDN CLI plugin Docker image
```bash
npm run build-plugin-image
``` 
- Build the connector packaging archive
```bash
npm run build-connector-tgz
``` 
This will create a connector-definition.tgz file in the root of the repository.
- Create a PromptQL Project
In a fresh directory, do the following:
```bash
ddn supergraph init <my-project> --with-promptql && cd <my-project>
``` 
- Init the connector
```bash
ddn connector init promptql_programs --from-package <path-to-connector-definition.tgz created from the above command> --add-env PROMPTQL_EXECUTE_PROGRAM_ENDPOINT=<Execute program API endpoint fo your DDN> --add-env PROMPTQL_API_KEY=<PromotQL API Key for your project against which automations should be run> --add-to-compose-file compose.yaml
``` 
Docs for getting execute program API endpoint details - https://promptql.io/docs/promptql-apis/execute-program-api/
- Add Argument presets to the connector for header forwarding
Add the following to `promptql_programs.hml` fileunder `definition` section to enable header forwarding. (Even if you don't need header forwarding add a dummy configuration)
```yaml
argumentPresets:
    - argument: headers
      value:
        httpHeaders:
          forward:
            - "Authorization" # Modify as per what all headers you need to forward. If you do not need header forwarding, still put a dummy header value here.
          additional: {}
```
- Add the Automation JSON Artifact
Download the Automation as a JSON artifact from the PromptQL console and place it in the `app/connector/promptql_programs/programs` directory. A sample automation JSON is available in the `sample-automation` directory.
- Introspect the connector
```bash
ddn connector introspect promptql_programs
```
- Add the commands
```bash
ddn command add promptql_programs "*"
```

- Do a local build
```bash
ddn supergraph build local
```

- Run PromptQL locally
```bash
ddn run docker-start
```
Then visit the console and invoke the sum automation via Playground


