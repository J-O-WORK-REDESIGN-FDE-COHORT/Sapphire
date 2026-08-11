# Sapphire Wellness Coach - LangGraph Integration Guide

## Overview

The Sapphire Wellness Coach is an AI-powered chat interface that uses the assistant-ui React library on the frontend and integrates with a LangGraph agent on the backend.

## Frontend Implementation

The frontend chat UI has been implemented using:
- **@assistant-ui/react**: Core chat UI components
- **@assistant-ui/react-markdown**: Markdown rendering support
- Component location: `client/src/components/sapphire-wellness-coach.tsx`

## Backend Integration Required

### API Endpoint

The frontend expects a POST endpoint at:
```
POST /api/wellness-coach/chat
```

### Request Format

```json
{
  "message": "User's current message",
  "history": [
    {
      "role": "user",
      "content": "Previous user message"
    },
    {
      "role": "assistant",
      "content": "Previous assistant response"
    }
  ]
}
```

### Response Format

```json
{
  "response": "AI assistant's response text",
  "message": "Alternative field for response (fallback)"
}
```

## LangGraph Agent Setup

### Required Components

1. **LangGraph Agent**: Create a conversational agent that can:
   - Access user health data
   - Provide personalized wellness recommendations
   - Answer health-related questions
   - Maintain conversation context

2. **Backend API Server**: Set up an Express/FastAPI server with the endpoint

3. **Integration Points**:
   - User authentication (use existing auth tokens)
   - Health data access (GraphQL queries)
   - Recommendation engine
   - Conversation memory/state management

### Example LangGraph Agent Structure

```python
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage

# Define the agent state
class AgentState(TypedDict):
    messages: List[Union[HumanMessage, AIMessage]]
    user_id: str
    health_data: dict

# Create the graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("retrieve_health_data", retrieve_health_data_node)
workflow.add_node("generate_response", generate_response_node)
workflow.add_node("provide_recommendations", provide_recommendations_node)

# Add edges
workflow.add_edge("retrieve_health_data", "generate_response")
workflow.add_conditional_edges(
    "generate_response",
    should_provide_recommendations,
    {
        "recommendations": "provide_recommendations",
        "end": END
    }
)

# Compile the graph
app = workflow.compile()
```

### Example Backend Endpoint (FastAPI)

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict

app = FastAPI()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]

class ChatResponse(BaseModel):
    response: str

@app.post("/api/wellness-coach/chat")
async def wellness_coach_chat(request: ChatRequest):
    try:
        # Convert history to LangGraph format
        messages = [
            HumanMessage(content=msg.content) if msg.role == "user" 
            else AIMessage(content=msg.content)
            for msg in request.history
        ]
        
        # Add current message
        messages.append(HumanMessage(content=request.message))
        
        # Run the LangGraph agent
        result = await app.ainvoke({
            "messages": messages,
            "user_id": get_current_user_id(),  # Implement auth
            "health_data": {}  # Fetch from your database
        })
        
        # Extract response
        response_text = result["messages"][-1].content
        
        return ChatResponse(response=response_text)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Example Backend Endpoint (Express/Node.js)

```javascript
const express = require('express');
const router = express.Router();

router.post('/api/wellness-coach/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    
    // Call your LangGraph agent
    const response = await callLangGraphAgent({
      message,
      history,
      userId: req.user.id,  // From auth middleware
      healthData: await fetchUserHealthData(req.user.id)
    });
    
    res.json({ response: response.text });
  } catch (error) {
    console.error('Wellness coach error:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      message: error.message 
    });
  }
});

module.exports = router;
```

## Environment Variables

Add these to your `.env` file:

```env
# LangGraph Configuration
LANGGRAPH_API_KEY=your_api_key_here
LANGGRAPH_AGENT_ID=your_agent_id_here

# OpenAI or other LLM provider
OPENAI_API_KEY=your_openai_key_here

# Optional: LangSmith for tracing
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_key_here
```

## Testing

1. Start your backend server with the LangGraph agent
2. Start the frontend: `npm run dev`
3. Click "Sapphire Wellness Coach" in the sidebar
4. Test the chat interface

## Features to Implement

- [ ] User health data retrieval
- [ ] Personalized recommendations based on health metrics
- [ ] Conversation memory across sessions
- [ ] Integration with existing wellness recommendations
- [ ] Safety guardrails for medical advice
- [ ] Rate limiting and usage tracking
- [ ] Error handling and fallback responses

## Security Considerations

1. **Authentication**: Ensure all requests are authenticated
2. **Data Privacy**: Handle health data according to HIPAA/GDPR
3. **Rate Limiting**: Prevent abuse of the AI endpoint
4. **Input Validation**: Sanitize user inputs
5. **Response Filtering**: Filter inappropriate or harmful content

## Next Steps

1. Set up your LangGraph agent backend
2. Configure the API endpoint
3. Test the integration
4. Add conversation persistence
5. Implement advanced features (voice input, file uploads, etc.)

## Support

For issues or questions, refer to:
- [assistant-ui documentation](https://www.assistant-ui.com/)
- [LangGraph documentation](https://langchain-ai.github.io/langgraph/)