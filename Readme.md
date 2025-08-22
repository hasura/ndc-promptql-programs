# NDC PromptQL Programs Connector

PromptQL Programs Connector allows you to invoke PromptQL Programs (Automations) as commands.

## Prerequisites

1. Create a [Hasura Cloud account](https://console.hasura.io)
2. Please ensure you have the [DDN CLI](https://hasura.io/docs/3.0/cli/installation) >= v3.5.0and
   [Docker](https://docs.docker.com/engine/install/) installed
3. [Create a supergraph](https://hasura.io/docs/3.0/getting-started/init-supergraph)
4. [Create a subgraph](https://hasura.io/docs/3.0/getting-started/init-subgraph)

The steps below explain how to initialize and configure a connector on your local machine (typically for development
purposes).You can learn how to deploy a connector to Hasura DDN — after it's been configured —
[here](https://hasura.io/docs/3.0/getting-started/deployment/deploy-a-connector).

## Using the connector

### Creating an automation in PromptQL playground

1. Use the steps 1 and 2 from the PromptQL [Docs](https://promptql.io/docs/automation/) to arrive at an automation that you want to be part of your supergraph. (Deploying the automation is not necessary. Deploying automations make it available to be used via a HTTP API and does not make it available via your PromptQL chat).
2. Download the Automation artifact as JSON from the console.

### Adding an automation to your project

From the root of your local project directory, do the following:

```bash
ddn promptql-programs add --from-artifact <path/to/the/downloaded/automation/json/file>
```

This command asks for a few inputs in interactive mode, if this the first automation thats being added to the project:

- **PROMPTQL_EXECUTE_PROGRAM_ENDPOINT**: The [[Execute Program endpoint](https://promptql.io/docs/promptql-apis/execute-program-api/#execute-program-endpoint)] of your DDN.
- **PROMPTQL_API_KEY**: API key for your PromptQL project. Can be created from the PromptQL console at Settings->PromptQL->Generate New API Key
- **Header forwarding**: The Automation program uses the the same auth mechanism as the rest of the supergraph. This means that the Automation program needs to forward the headers from the incoming request to the PromptQL API. Add any headers that needs to be forwarded to the Automation program as Comma-Separated values. (Note: if your Project's API access mode is set to private, you need to allow for `x-hasura-ddn-token` header to be forwarded and you need to send this header from your client applications. Playground sends this by default).

This command does the following behind the scenes:

- Creates a `promptql_programs` connector if not already present.
- Adds the automation JSON file to the `promptql_programs` connector's `programs` directory.
- Introspects the `promptql_programs` connector.
- Adds the automation as a command.

From here, your can follow the normal steps to build and run your supergraph locally or deploy it to cloud.

### Updating an existing automation

To evolve and iterate your Automation programs, you can upload the Automation JSON to the playground and guide PromptQL to evolve the program. You can then download the updated Automation JSON and do the following:

```bash
ddn promptql-programs update --from-artifact <path/to/the/updated/automation/json/file>
```

_Things to ensure:_

- The `title` of the automation remains the same. If it has changed, manually modify the `title` field in the downloaded JSON to match the existing automation's title.

If your updated Automation has only additive changes (i.e. does not modify/remove/rename any fields in the input/output schema of the automation program), you can simply run the above command to update your automation and deploy your project.

#### Updating automations with breaking changes

If your updated Automation has breaking changes (i.e. modifies/removes any fields in the input/output schema of the automation program.), you need to do the following before deploying your project (You can quickly identify if there are breaking changes by running `ddn supergraph build local`. If there are no errors, you are good to deploy.) :

- Run `ddn supergraph prune`. This removes any top-level metadata objects that are not required anymore
- Use the Hasura VS Code extension to fix any field and type issues. The errors will be denoted by red squiggly lines in the code.

### Notes

- If the Input or output schema of a program results in types that are [not supported](https://github.com/hasura/ndc-nodejs-lambda?tab=readme-ov-file#unsupported-types) by the NDC Nodejs lambda connector, the program will not be available to track as a command. For eg., Enums and generic Object type fields without its properties defined will result in unsupported types. To get around this, change the schema to use a string instead of enum and add the possible values of this enum as a description in the Command/Object Type for PromptQL to use. If it is a generic object type field, define the properties of the object in the input/output schema.

- The order of the fields in the output is governed by the order in which they are defined in the output schema and the way in which PromptQL invokes this command. Ensure that both are aligned.

### Best Practices

- Refer [here](https://promptql.io/docs/automation/#best-practices) for best practices on authoring PromptQL automations.
- Ensure your input/output schema does not result in unsupported types. Refer the [Notes](#notes) section above for more details.
- The Automation is executed against the build that is currently applied to the PromptQL project. Ensure that the applied build has no regressions (in terms of the tracked tables/columns/fields/Permissions, etc,.) and is in a state where it can execute the Automation program.
- Ensure the `title` has not changed when evolving the Automation program.
- Add relevant descriptions in the Command and ObjectType for this automation.
