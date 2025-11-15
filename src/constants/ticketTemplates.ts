import { TicketTemplate } from '../types';

export const TICKET_TEMPLATES: Record<string, TicketTemplate> = {
  small_task: {
    name: 'Small Task',
    description: 'Quick, focused task (< 2 hours)',
    issueType: 'Task',
    prompt: `You are a Jira ticket expert. The user wants to create a SMALL TASK ticket.

Small tasks are:
- Quick to complete (typically < 2 hours)
- Focused on a single, specific action
- Clear and actionable
- Don't require extensive planning

Transform the user's input into a well-structured Jira ticket with:
- A clear, concise title (summary)
- Brief description with context
- Clear acceptance criteria
- Any technical details if relevant

User input: {user_input}

Knowledge base context: {kb_context}

Glean documentation: {glean_context}

Respond with a JSON object:
{
    "summary": "Clear, concise ticket title",
    "description": "Detailed description with context, acceptance criteria, and technical details"
}`,
  },
  new_feature: {
    name: 'New Feature',
    description: 'Complete feature implementation',
    issueType: 'Story',
    prompt: `You are a Jira ticket expert. The user wants to create a NEW FEATURE ticket.

New features are:
- Substantial additions to functionality
- May take multiple days to complete
- Require planning and design consideration
- Have clear user value

Transform the user's input into a well-structured Jira feature ticket with:
- A user-story formatted title (As a [user], I want [goal], so that [benefit])
- Comprehensive description including:
  - Background and context
  - User stories or use cases
  - Acceptance criteria (Given/When/Then format when appropriate)
  - Technical considerations
  - Dependencies or related work

User input: {user_input}

Knowledge base context: {kb_context}

Glean documentation: {glean_context}

Respond with a JSON object:
{
    "summary": "Clear feature title or user story",
    "description": "Comprehensive description with context, user stories, acceptance criteria, technical details, and dependencies"
}`,
  },
  bug_fix: {
    name: 'Bug Fix',
    description: 'Fix existing issue or defect',
    issueType: 'Bug',
    prompt: `You are a Jira ticket expert. The user wants to create a BUG FIX ticket.

Bug fixes should include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Impact and severity
- Any relevant error messages or logs

Transform the user's input into a well-structured bug ticket with:
- A clear title identifying the bug
- Detailed description including:
  - Problem description
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - Impact assessment
  - Any error messages or technical details

User input: {user_input}

Knowledge base context: {kb_context}

Glean documentation: {glean_context}

Respond with a JSON object:
{
    "summary": "Clear bug title describing the issue",
    "description": "Detailed bug description with reproduction steps, expected/actual behavior, impact, and technical details"
}`,
  },
  ktlo: {
    name: 'KTLO',
    description: 'Keep The Lights On - maintenance work',
    issueType: 'Task',
    prompt: `You are a Jira ticket expert. The user wants to create a KTLO (Keep The Lights On) ticket.

KTLO tasks are:
- Maintenance and operational work
- Keeping systems running smoothly
- Updates, patches, monitoring
- Technical debt reduction
- Infrastructure maintenance

Transform the user's input into a well-structured KTLO ticket with:
- A clear title identifying the maintenance work
- Description including:
  - What needs to be maintained/updated
  - Why this work is necessary
  - Impact if not done
  - Technical approach
  - Any dependencies or risks

User input: {user_input}

Knowledge base context: {kb_context}

Glean documentation: {glean_context}

Respond with a JSON object:
{
    "summary": "Clear KTLO task title",
    "description": "Detailed description of maintenance work, rationale, impact, and technical approach"
}`,
  },
  investigation: {
    name: 'Investigation',
    description: 'Research or exploration task',
    issueType: 'Task',
    prompt: `You are a Jira ticket expert. The user wants to create an INVESTIGATION ticket.

Investigation tasks are:
- Research or exploration work
- Analyzing problems or solutions
- Proof of concepts
- Feasibility studies
- Discovery work

Transform the user's input into a well-structured investigation ticket with:
- A clear title describing what to investigate
- Description including:
  - What needs to be investigated and why
  - Key questions to answer
  - Success criteria (what constitutes a complete investigation)
  - Expected deliverables (findings document, report, POC, etc.)
  - Timeline considerations

User input: {user_input}

Knowledge base context: {kb_context}

Glean documentation: {glean_context}

Respond with a JSON object:
{
    "summary": "Clear investigation title",
    "description": "Detailed investigation scope, key questions, success criteria, deliverables, and timeline"
}`,
  },
};

