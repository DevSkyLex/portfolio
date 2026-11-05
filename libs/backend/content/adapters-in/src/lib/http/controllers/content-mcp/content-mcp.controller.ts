import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  type CanActivate,
  Controller,
  Delete,
  type ExecutionContext,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  Inject,
  Injectable,
  Options,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  bearerChallenge,
  hasScopes,
  MCP_AUTH_OPTIONS,
  type McpAuthOptions,
  McpScope,
  mcpPrincipalOf,
  protectedResourceMetadata,
  protectedResourceMetadataUrl,
} from '@vfortin/backend-auth';
import type { McpScopeName, ProtectedResourceMetadata } from '@vfortin/identity-contracts';
import type { Request, Response } from 'express';
import { ContentMcpTools } from '@internal/content-adapters-in/lib/mcp/content-mcp-tools/content-mcp-tools';

/** Validates browser origins and sets CORS before authentication, including on OAuth challenges. */
@Injectable()
class ContentMcpOriginGuard implements CanActivate {
  public constructor(@Inject(MCP_AUTH_OPTIONS) private readonly options: McpAuthOptions) {}

  public canActivate(context: ExecutionContext): boolean {
    const http: ReturnType<ExecutionContext['switchToHttp']> = context.switchToHttp();
    const request: Request = http.getRequest<Request>();
    const response: Response = http.getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store');
    response.vary('Origin');
    const origin: string | undefined = request.headers.origin;
    if (origin !== undefined) {
      if (origin !== new URL(this.options.resource).origin) {
        throw new ForbiddenException({
          code: 'request.origin-forbidden',
          message: 'The request origin is not allowed.',
        });
      }
      response.setHeader('Access-Control-Allow-Origin', origin);
    }
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID',
    );
    response.setHeader(
      'Access-Control-Expose-Headers',
      'WWW-Authenticate, MCP-Protocol-Version, Mcp-Session-Id',
    );
    return true;
  }
}

/** OAuth-protected, stateless Streamable HTTP resource with public discovery (D45, D49). */
@Controller('content/mcp')
@UseGuards(ContentMcpOriginGuard)
export class ContentMcpController {
  public constructor(
    @Inject(MCP_AUTH_OPTIONS) private readonly options: McpAuthOptions,
    @Inject(ContentMcpTools) private readonly tools: ContentMcpTools,
  ) {}

  /** Discovery is public so clients can find the authorization server before signing in. */
  @Get('.well-known/oauth-protected-resource')
  @Header('Cache-Control', 'no-store')
  public metadata(): ProtectedResourceMetadata {
    return protectedResourceMetadata({
      resource: this.options.resource,
      authorizationServer: this.options.issuer,
      resourceName: 'Portfolio content',
    });
  }

  /** Browser preflight never requires a token or cookies. */
  @Options(['', '.well-known/oauth-protected-resource'])
  @HttpCode(204)
  public preflight(): void {
    return;
  }

  /** A fresh SDK server and transport own exactly this request; no session stores credentials. */
  @Post()
  @McpScope('content:read')
  public async handle(@Req() request: Request, @Res() response: Response): Promise<void> {
    const scopes: readonly McpScopeName[] = mcpPrincipalOf(request).scopes;
    const body: unknown = request.body;
    if (
      typeof body === 'object' &&
      body !== null &&
      'method' in body &&
      body.method === 'tools/call' &&
      'params' in body
    ) {
      const params: unknown = body.params;
      if (
        typeof params === 'object' &&
        params !== null &&
        'name' in params &&
        typeof params.name === 'string'
      ) {
        const required: readonly McpScopeName[] = await this.tools.requiredScopes(
          params.name,
          'arguments' in params ? params.arguments : undefined,
        );
        if (!hasScopes(scopes, required)) {
          response.setHeader(
            'WWW-Authenticate',
            bearerChallenge({
              resourceMetadataUrl: protectedResourceMetadataUrl(this.options.resource),
              scope: required,
              error: 'insufficient_scope',
            }),
          );
          throw new ForbiddenException({
            code: 'auth.insufficient-scope',
            message: 'The access token lacks a required scope.',
          });
        }
      }
    }
    const server: Server = this.tools.createServer(scopes);
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
    });
    // handleRequest may return before an async tool finishes; close only when the response closes.
    response.once('close', (): void => {
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, body);
    } catch {
      await server.close();
      if (!response.headersSent)
        response.status(500).json({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32603, message: 'The MCP request failed.' },
        });
    }
  }

  /** This resource has no standalone event stream or sessions to terminate. */
  @Get()
  @McpScope('content:read')
  public events(@Res() response: Response): void {
    this.unsupported(response);
  }

  /** Stateless resources have no session to delete. */
  @Delete()
  @McpScope('content:read')
  public terminate(@Res() response: Response): void {
    this.unsupported(response);
  }

  private unsupported(response: Response): void {
    response.setHeader('Allow', 'POST, OPTIONS');
    response
      .status(405)
      .json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Method not allowed.' } });
  }
}
