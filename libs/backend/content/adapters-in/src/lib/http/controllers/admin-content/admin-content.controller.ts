import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { AdminOnly } from '@vfortin/backend-auth';
import { IfMatchVersion, ZodValidationPipe, versionEtag } from '@vfortin/backend-http';
import {
  CreateArticle,
  GetAdminArticle,
  ListAdminArticles,
  PublishArticle,
  ReviseArticle,
  UnpublishArticle,
  type AdminArticleView,
  type ArticleChangeResult,
} from '@vfortin/content-application';
import {
  ArticleRevisionRequestSchema,
  PublicationKindQuerySchema,
  type AdminArticleDto,
  type AdminArticleList,
  type ArticleRevisionRequest,
  type PublicationKindQuery,
} from '@vfortin/content-contracts';
import type { PublicationKind } from '@vfortin/content-domain';
import type { Request, Response } from 'express';
import {
  toAdminArticleDto,
  toArticleRevision,
  toLegacyArticleDto,
} from '@internal/content-adapters-in/lib/http/presenters/admin-article/admin-article.presenter';

const legacyPath: RegExp = /\/content\/admin\/projects(?:\/|$)/;

/** Publishes the article administration API and its filtered compatibility routes. */
@Controller(['content/admin/articles', 'content/admin/projects'])
@AdminOnly()
export class AdminContentController {
  public constructor(
    @Inject(ListAdminArticles) private readonly listArticles: ListAdminArticles,
    @Inject(GetAdminArticle) private readonly getArticle: GetAdminArticle,
    @Inject(CreateArticle) private readonly createArticle: CreateArticle,
    @Inject(ReviseArticle) private readonly reviseArticle: ReviseArticle,
    @Inject(PublishArticle) private readonly publishArticle: PublishArticle,
    @Inject(UnpublishArticle) private readonly unpublishArticle: UnpublishArticle,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  public async list(
    @Req() request: Request,
    @Query(new ZodValidationPipe(PublicationKindQuerySchema)) query: PublicationKindQuery,
  ): Promise<AdminArticleList> {
    const articles: AdminArticleView[] = await this.listArticles.execute(this.kind(request, query));
    const presenter: typeof toAdminArticleDto = this.presenter(request);
    const member: AdminArticleDto[] = articles.map((view) => presenter(view.article, view.media));
    return { member, totalItems: member.length };
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  public async get(
    @Param('id') id: string,
    @Req() request: Request,
    @Query(new ZodValidationPipe(PublicationKindQuerySchema)) query: PublicationKindQuery,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminArticleDto> {
    return this.respond(
      request,
      response,
      await this.getArticle.execute(id, this.kind(request, query)),
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  public async create(
    @Body(new ZodValidationPipe(ArticleRevisionRequestSchema)) body: ArticleRevisionRequest,
    @Req() request: Request,
    @Query(new ZodValidationPipe(PublicationKindQuerySchema)) query: PublicationKindQuery,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminArticleDto> {
    const result: ArticleChangeResult = await this.createArticle.execute(
      toArticleRevision(body),
      this.kind(request, query),
    );
    return this.respond(request, response, result, result.version);
  }

  @Put(':id')
  public async revise(
    @Param('id') id: string,
    @IfMatchVersion() expectedVersion: number,
    @Body(new ZodValidationPipe(ArticleRevisionRequestSchema)) body: ArticleRevisionRequest,
    @Req() request: Request,
    @Query(new ZodValidationPipe(PublicationKindQuerySchema)) query: PublicationKindQuery,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminArticleDto> {
    const result: ArticleChangeResult = await this.reviseArticle.execute(
      id,
      expectedVersion,
      toArticleRevision(body),
      this.kind(request, query),
    );
    return this.respond(request, response, result, result.version);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  public async publish(
    @Param('id') id: string,
    @IfMatchVersion() expectedVersion: number,
    @Req() request: Request,
    @Query(new ZodValidationPipe(PublicationKindQuerySchema)) query: PublicationKindQuery,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminArticleDto> {
    const result: ArticleChangeResult = await this.publishArticle.execute(
      id,
      expectedVersion,
      this.kind(request, query),
    );
    return this.respond(request, response, result, result.version);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  public async unpublish(
    @Param('id') id: string,
    @IfMatchVersion() expectedVersion: number,
    @Req() request: Request,
    @Query(new ZodValidationPipe(PublicationKindQuerySchema)) query: PublicationKindQuery,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminArticleDto> {
    const result: ArticleChangeResult = await this.unpublishArticle.execute(
      id,
      expectedVersion,
      this.kind(request, query),
    );
    return this.respond(request, response, result, result.version);
  }

  private respond(
    request: Request,
    response: Response,
    { article, media }: AdminArticleView,
    version: number = article.version,
  ): AdminArticleDto {
    response.setHeader('ETag', versionEtag(version));
    return this.presenter(request)(article, media, version);
  }

  private presenter(request: Request): typeof toAdminArticleDto {
    return legacyPath.test(request.path) ? toLegacyArticleDto : toAdminArticleDto;
  }

  private kind(request: Request, query: PublicationKindQuery): PublicationKind | undefined {
    return legacyPath.test(request.path) ? query.kind : undefined;
  }
}
