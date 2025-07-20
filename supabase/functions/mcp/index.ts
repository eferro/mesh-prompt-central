import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params?: any;
  id?: string | number;
}

interface JsonRpcResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id?: string | number;
}

async function validateApiKey(authHeader: string | null): Promise<{ user_id: string; organization_id: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.substring(7);
  
  // Hash the provided API key
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('user_id, organization_id')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single();

  if (error || !keyData) {
    return null;
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', keyHash);

  return keyData;
}

async function handleJsonRpc(request: JsonRpcRequest, auth: { user_id: string; organization_id: string }): Promise<JsonRpcResponse> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    switch (request.method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              prompts: {
                listChanged: true
              },
              tools: {
                listChanged: true
              }
            },
            serverInfo: {
              name: 'PromptMesh MCP Server',
              version: '1.0.0'
            }
          },
          id: request.id
        };
      }

      case 'prompts/list': {
        const { data: prompts, error } = await supabase
          .from('prompts')
          .select(`
            id,
            name,
            description,
            prompt_variants!inner(
              content,
              is_default
            )
          `)
          .eq('organization_id', auth.organization_id)
          .eq('prompt_variants.is_default', true);

        if (error) throw error;

        const promptList = prompts.map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          arguments: [] // TODO: Load arguments
        }));

        return {
          jsonrpc: '2.0',
          result: {
            prompts: promptList
          },
          id: request.id
        };
      }

      case 'prompts/get': {
        const { name } = request.params || {};
        if (!name) {
          throw new Error('Prompt name is required');
        }

        const { data: prompt, error: promptError } = await supabase
          .from('prompts')
          .select(`
            id,
            name,
            description,
            prompt_variants!inner(
              content,
              is_default
            )
          `)
          .eq('organization_id', auth.organization_id)
          .eq('name', name)
          .eq('prompt_variants.is_default', true)
          .single();

        if (promptError || !prompt) {
          throw new Error('Prompt not found');
        }

        // Load arguments
        const { data: args } = await supabase
          .from('prompt_arguments')
          .select('name, description, required')
          .eq('prompt_id', prompt.id);

        return {
          jsonrpc: '2.0',
          result: {
            description: prompt.description,
            arguments: args?.map(arg => ({
              name: arg.name,
              description: arg.description,
              required: arg.required
            })) || [],
            prompt: {
              role: 'user',
              content: {
                type: 'text',
                text: prompt.prompt_variants[0].content
              }
            }
          },
          id: request.id
        };
      }

      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          result: {
            tools: [
              {
                name: 'search_prompts',
                description: 'Search for prompts in the organization',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: 'Search query to find prompts'
                    }
                  },
                  required: ['query']
                }
              }
            ]
          },
          id: request.id
        };
      }

      case 'tools/call': {
        const { name, arguments: toolArgs } = request.params || {};
        
        if (name === 'search_prompts') {
          const { query } = toolArgs || {};
          if (!query) {
            throw new Error('Search query is required');
          }

          const { data: prompts, error } = await supabase
            .from('prompts')
            .select(`
              id,
              name,
              description,
              prompt_variants!inner(
                content,
                is_default
              )
            `)
            .eq('organization_id', auth.organization_id)
            .eq('prompt_variants.is_default', true)
            .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

          if (error) throw error;

          return {
            jsonrpc: '2.0',
            result: {
              content: [
                {
                  type: 'text',
                  text: `Found ${prompts.length} prompts matching "${query}":\n\n` +
                    prompts.map(p => `**${p.name}**\n${p.description}\n`).join('\n')
                }
              ]
            },
            id: request.id
          };
        }

        throw new Error(`Unknown tool: ${name}`);
      }

      default:
        throw new Error(`Unknown method: ${request.method}`);
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: error.message
      },
      id: request.id
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  // Validate API key
  const auth = await validateApiKey(req.headers.get('authorization'));
  if (!auth) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing API key' }), 
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    if (url.pathname === '/mcp/stream' && req.method === 'GET') {
      // Server-Sent Events endpoint for streaming
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"type":"connection","status":"connected"}\n\n'));
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    if (url.pathname === '/mcp' && req.method === 'POST') {
      // JSON-RPC endpoint
      const requestBody = await req.json() as JsonRpcRequest;
      const response = await handleJsonRpc(requestBody, auth);
      
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { 
      status: 404, 
      headers: corsHeaders 
    });
  } catch (error) {
    console.error('MCP Server Error:', error);
    return new Response(
      JSON.stringify({ 
        jsonrpc: '2.0',
        error: { 
          code: -32603, 
          message: 'Internal error' 
        } 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});