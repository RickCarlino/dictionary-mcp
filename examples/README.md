# Dictionary Examples

This directory contains example dictionaries that demonstrate how to structure and organize terminology for different use cases.

## Available Examples

### 1. Engineering Terms (`engineering.json`)

A comprehensive dictionary of software engineering and technical terminology including:

- API technologies (REST, GraphQL, OAuth)
- Development methodologies (Agile, TDD)
- Infrastructure and DevOps (Docker, Kubernetes, CI/CD)
- Database concepts (SQL, NoSQL, ORM)
- Security terms (JWT, SSL/TLS, CORS)

**Use case**: Perfect for onboarding new developers or maintaining consistency in technical documentation.

### 2. Business & Finance (`business-finance.json`)

Business and financial terminology commonly used in corporate environments:

- Financial metrics (ROI, EBITDA, P&L)
- SaaS metrics (ARR, MRR, CAC, LTV)
- Business models (B2B, B2C, SaaS)
- Growth metrics (YoY, QoQ, CAGR)
- Customer metrics (NPS, Churn Rate)

**Use case**: Ideal for business teams, analysts, and anyone working with financial or business metrics.

### 3. Project ACME (`project-acme.json`)

An example of project-specific terminology:

- Internal tools and services (QRS, LMZ, DART)
- Team names and structures
- Project codenames
- Environment names
- Custom metrics and processes

**Use case**: Template for creating your own project-specific dictionary to help team members understand internal jargon.

## How to Use These Examples

### Importing via MCP Client

Using the dictionary MCP server, you can import these examples:

```javascript
// Import the engineering dictionary
await client.callTool("import_dictionary", {
  format: "json",
  data: fs.readFileSync("./examples/dictionaries/engineering.json", "utf-8"),
});
```

### Manual Import Script

You can also use the provided import script (if using Bun):

```bash
# Import a single dictionary
bun run examples/import.ts engineering.json

# Import all example dictionaries
bun run examples/import-all.ts
```

### Structure Reference

Each dictionary follows this structure:

```json
{
  "name": "Dictionary Name",
  "description": "Description of the dictionary",
  "terms": [
    {
      "term": "TERM",
      "definitions": [
        {
          "definition": "Primary definition",
          "context": "usage context"
        },
        {
          "definition": "Alternative definition",
          "context": "different context"
        }
      ]
    }
  ]
}
```

## Creating Your Own Dictionary

To create a custom dictionary:

1. Copy one of the example files as a template
2. Update the `name` and `description`
3. Replace the terms with your own:
   - Use clear, concise definitions
   - Add context to disambiguate multiple meanings
   - Include examples where helpful
   - Consider your audience's knowledge level

## Best Practices

1. **Consistency**: Use consistent formatting and style across definitions
2. **Context**: Always provide context when a term has multiple meanings
3. **Clarity**: Write definitions that are clear to your target audience
4. **Completeness**: Include related terms that often appear together
5. **Maintenance**: Regularly review and update definitions as terminology evolves

## Integration Examples

### Text Scanning

```javascript
// Scan a document for known terms
const result = await client.callTool("text_scan", {
  text: "Our CI/CD pipeline uses Docker containers orchestrated by Kubernetes",
  dictionaries: ["Engineering Terms"],
});
```

### Highlighting Terms

```javascript
// Highlight dictionary terms in text
const highlighted = await client.callTool("text_highlight", {
  text: "The ROI on our SaaS platform exceeded our CAC within 6 months",
  format: "markdown",
});
```

## Contributing

Feel free to submit pull requests with additional example dictionaries for:

- Industry-specific terminology (healthcare, legal, education)
- Programming language-specific terms
- Framework or tool-specific glossaries
- Regional or cultural business terms
