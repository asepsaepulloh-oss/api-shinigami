import axios, { AxiosInstance } from "axios";
import {
  Manga,
  MangaListResponse,
  MangaDetails,
  Chapter,
  Page,
} from "../types/manga.types";

export class ShinigamiService {
  private baseUrl: string;
  private apiUrl: string;
  private fallbackChapterApiUrl: string;
  private cdnUrl: string;
  private client: AxiosInstance;

  constructor() {
    this.baseUrl = "https://app.shinigami.asia";
    this.apiUrl = "https://api.shinigami.io";
    this.fallbackChapterApiUrl = "https://api.shngm.io";
    this.cdnUrl = "https://storage.shngm.id";

    this.client = axios.create({
      timeout: 30000,
      headers: this.getApiHeaders(),
    });
  }

  private randomString(length: number): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getApiHeaders(): Record<string, string> {
    return {
      Accept: "application/json",
      DNT: "1",
      Origin: this.baseUrl,
      "Sec-GPC": "1",
      "X-Requested-With": this.randomString(Math.floor(Math.random() * 20) + 1),
    };
  }

  // Never send Origin header to chapter list upstreams (api.shngm.io returns 502 with Origin)
  private getChapterHeaders(): Record<string, string> {
    return {
      Accept: "application/json",
      DNT: "1",
      "Sec-GPC": "1",
    };
  }

  private getImageHeaders(): Record<string, string> {
    return {
      Accept:
        "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      DNT: "1",
      Referer: `${this.baseUrl}/`,
      "Sec-Fetch-Dest": "empty",
      "Sec-GPC": "1",
      "X-Requested-With": this.randomString(Math.floor(Math.random() * 20) + 1),
    };
  }

  private toStatus(statusCode: number): string {
    if (statusCode === 1) return "Ongoing";
    if (statusCode === 2) return "Completed";
    return "Unknown";
  }

  async getPopularManga(page: number = 1): Promise<MangaListResponse> {
    try {
      const response = await this.client.get(`${this.apiUrl}/v1/manga/list`, {
        params: {
          page,
          page_size: 30,
          sort: "popularity",
        },
      });

      if (!response.data || !response.data.data) {
        throw new Error("Invalid response from API");
      }

      const mangas: Manga[] = response.data.data.map((item: any) => ({
        title: item.title || "Unknown",
        thumbnail: item.cover_image_url || item.cover_portrait_url || "",
        url: item.manga_id || "",
        mangaUrl: `${this.baseUrl}/series/${item.manga_id}`,
      }));

      return {
        mangas,
        hasNextPage:
          response.data.meta?.page < response.data.meta?.total_page || false,
      };
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Failed to get popular manga: ${error.response.status} - ${
            error.response.data?.message || error.message
          }`
        );
      }
      throw new Error(`Failed to get popular manga: ${error.message}`);
    }
  }

  async getLatestUpdates(page: number = 1): Promise<MangaListResponse> {
    try {
      const response = await this.client.get(`${this.apiUrl}/v1/manga/list`, {
        params: {
          page,
          page_size: 30,
          sort: "latest",
        },
      });

      if (!response.data || !response.data.data) {
        throw new Error("Invalid response from API");
      }

      const mangas: Manga[] = response.data.data.map((item: any) => ({
        title: item.title || "Unknown",
        thumbnail: item.cover_image_url || item.cover_portrait_url || "",
        url: item.manga_id || "",
        mangaUrl: `${this.baseUrl}/series/${item.manga_id}`,
      }));

      return {
        mangas,
        hasNextPage:
          response.data.meta?.page < response.data.meta?.total_page || false,
      };
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Failed to get latest updates: ${error.response.status} - ${
            error.response.data?.message || error.message
          }`
        );
      }
      throw new Error(`Failed to get latest updates: ${error.message}`);
    }
  }

  async searchManga(
    query: string,
    page: number = 1
  ): Promise<MangaListResponse> {
    try {
      const params: any = {
        page,
        page_size: 30,
      };

      if (query && query.length > 0) {
        params.q = query;
      }

      const response = await this.client.get(`${this.apiUrl}/v1/manga/list`, {
        params,
      });

      if (!response.data || !response.data.data) {
        throw new Error("Invalid response from API");
      }

      const mangas: Manga[] = response.data.data.map((item: any) => ({
        title: item.title || "Unknown",
        thumbnail: item.cover_image_url || item.cover_portrait_url || "",
        url: item.manga_id || "",
        mangaUrl: `${this.baseUrl}/series/${item.manga_id}`,
      }));

      return {
        mangas,
        hasNextPage:
          response.data.meta?.page < response.data.meta?.total_page || false,
      };
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Failed to search manga: ${error.response.status} - ${
            error.response.data?.message || error.message
          }`
        );
      }
      throw new Error(`Failed to search manga: ${error.message}`);
    }
  }

  async getMangaDetails(mangaId: string): Promise<MangaDetails> {
    try {
      const response = await this.client.get(
        `${this.apiUrl}/v1/manga/detail/${mangaId}`
      );

      if (!response.data || !response.data.data) {
        throw new Error("Invalid response from API");
      }

      const data = response.data.data;
      const taxonomy = data.taxonomy || {};

      const getNames = (items: any[]): string =>
        items ? items.map((item) => item.name).join(", ") : "";

      const authors = getNames(taxonomy.Author);
      const artists = getNames(taxonomy.Artist);
      const genres = getNames(taxonomy.Genre);
      const format = getNames(taxonomy.Format);

      const tags = [genres, format].filter((t) => t.length > 0).join(", ");

      return {
        title: data.title || "Unknown",
        author: authors || "Unknown",
        artist: artists || "Unknown",
        status: this.toStatus(data.status),
        description: data.description || "",
        genre: tags || "",
        thumbnail: data.cover_image_url || data.cover_portrait_url || "",
      };
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Failed to get manga details: ${error.response.status} - ${
            error.response.data?.message || error.message
          }`
        );
      }
      throw new Error(`Failed to get manga details: ${error.message}`);
    }
  }

  private extractChapterItems(payload: any): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload?.chapter_list && Array.isArray(payload.chapter_list)) {
      return payload.chapter_list;
    }
    if (payload?.data && Array.isArray(payload.data)) {
      return payload.data;
    }
    return [];
  }

  private async requestChapterPage(
    baseUrl: string,
    mangaId: string,
    params: Record<string, string | number>
  ): Promise<any> {
    const response = await axios.get(
      `${baseUrl}/v1/chapter/${encodeURIComponent(mangaId)}/list`,
      {
        params,
        headers: this.getChapterHeaders(),
        timeout: 15000,
      }
    );
    return response.data;
  }

  private async fetchAllChaptersCursorOrPaged(
    baseUrl: string,
    mangaId: string,
    candidatePageSizes: number[],
    useLimitParam: boolean
  ): Promise<any[]> {
    let firstPayload: any = null;
    let activePageSize = candidatePageSizes[candidatePageSizes.length - 1];
    let lastError: any = null;

    for (const size of candidatePageSizes) {
      try {
        const params: Record<string, string | number> = useLimitParam
          ? {
              limit: size,
              sort_by: "chapter_number",
              sort_order: "desc",
            }
          : {
              page: 1,
              page_size: size,
              sort_by: "chapter_number",
              sort_order: "desc",
            };

        firstPayload = await this.requestChapterPage(baseUrl, mangaId, params);
        activePageSize = size;
        break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!firstPayload) {
      throw lastError || new Error("Failed to fetch initial chapter page");
    }

    const allRawChapters: any[] = [...this.extractChapterItems(firstPayload)];
    const meta = firstPayload?.meta || {};

    // Case 1: Page-based pagination (meta.total_page > 1)
    const totalPage = Number(meta.total_page || 0);
    if (totalPage > 1) {
      const BATCH_CONCURRENCY = 6;
      const pagesToFetch: number[] = [];
      for (let p = 2; p <= totalPage; p++) {
        pagesToFetch.push(p);
      }

      for (let i = 0; i < pagesToFetch.length; i += BATCH_CONCURRENCY) {
        const batch = pagesToFetch.slice(i, i + BATCH_CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map((pageNum) =>
            this.requestChapterPage(baseUrl, mangaId, {
              page: pageNum,
              page_size: activePageSize,
              sort_by: "chapter_number",
              sort_order: "desc",
            })
          )
        );

        for (let idx = 0; idx < results.length; idx++) {
          const result = results[idx];
          if (result.status === "fulfilled") {
            allRawChapters.push(...this.extractChapterItems(result.value));
          } else {
            console.warn(
              `[ShinigamiService] Failed fetching chapter page ${batch[idx]} for manga ${mangaId}:`,
              result.reason?.response?.status || result.reason?.message
            );
          }
        }
      }

      return allRawChapters;
    }

    // Case 2: Cursor-based pagination (meta.has_next && meta.next_cursor)
    let hasNext = Boolean(meta.has_next && meta.next_cursor);
    let nextCursor: string | undefined = meta.next_cursor;
    const seenCursors = new Set<string>();
    const MAX_CURSOR_REQUESTS = 100;
    let cursorRequests = 0;

    while (hasNext && nextCursor && cursorRequests < MAX_CURSOR_REQUESTS) {
      if (seenCursors.has(nextCursor)) {
        break;
      }
      seenCursors.add(nextCursor);
      cursorRequests++;

      try {
        const pagePayload = await this.requestChapterPage(baseUrl, mangaId, {
          limit: activePageSize,
          cursor: nextCursor,
          sort_by: "chapter_number",
          sort_order: "desc",
        });

        const items = this.extractChapterItems(pagePayload);
        if (items.length === 0) {
          break;
        }
        allRawChapters.push(...items);

        const nextMeta = pagePayload?.meta || {};
        hasNext = Boolean(nextMeta.has_next && nextMeta.next_cursor);
        nextCursor = nextMeta.next_cursor;
      } catch (err: any) {
        console.warn(
          `[ShinigamiService] Failed fetching cursor batch #${cursorRequests} for manga ${mangaId}:`,
          err?.response?.status || err?.message
        );
        // Return chapters collected so far instead of crashing the entire request
        break;
      }
    }

    return allRawChapters;
  }

  private normalizeAndSortChapters(
    rawChapters: any[],
    mangaId: string
  ): Chapter[] {
    interface MappedChapter {
      chapter: Chapter;
      chapterNumber: number;
      originalIndex: number;
    }

    const seenIds = new Set<string>();
    const mapped: MappedChapter[] = [];

    for (let index = 0; index < rawChapters.length; index++) {
      const item = rawChapters[index];
      if (!item) continue;

      const chapterId = String(item.chapter_id || item.id || "").trim();
      if (!chapterId) continue;

      // Deduplicate by chapter_id (url)
      if (seenIds.has(chapterId)) {
        continue;
      }
      seenIds.add(chapterId);

      // Parse release_date into Unix timestamp in milliseconds
      let dateUpload = 0;
      const dateStr = item.release_date || item.date || item.created_at;
      if (typeof dateStr === "number" && Number.isFinite(dateStr)) {
        dateUpload = dateStr;
      } else if (dateStr) {
        const parsedDate = Date.parse(String(dateStr));
        dateUpload = Number.isNaN(parsedDate) ? 0 : parsedDate;
      }

      const rawNum = item.chapter_number ?? item.name ?? item.number ?? "";
      const chapterNumStr = String(rawNum).trim().replace(/\.0+$/, "");
      const parsedNum = Number(rawNum);
      const numericOrder = Number.isFinite(parsedNum)
        ? parsedNum
        : Number.NEGATIVE_INFINITY;

      const chapterTitle = String(
        item.chapter_title || item.title || ""
      ).trim();

      let name: string;
      if (chapterNumStr && chapterTitle) {
        name = `Chapter ${chapterNumStr} - ${chapterTitle}`;
      } else if (chapterNumStr) {
        name = `Chapter ${chapterNumStr}`;
      } else if (chapterTitle) {
        name = chapterTitle;
      } else {
        name = "Chapter";
      }

      mapped.push({
        chapter: {
          name: name.trim(),
          dateUpload,
          url: chapterId,
          chapterUrl: `${this.baseUrl}/series/${mangaId}/${chapterId}`,
        },
        chapterNumber: numericOrder,
        originalIndex: index,
      });
    }

    // Sort descending by chapter_number (newest -> oldest)
    mapped.sort((a, b) => {
      if (b.chapterNumber !== a.chapterNumber) {
        return b.chapterNumber - a.chapterNumber;
      }
      if (b.chapter.dateUpload !== a.chapter.dateUpload) {
        return b.chapter.dateUpload - a.chapter.dateUpload;
      }
      return a.originalIndex - b.originalIndex;
    });

    return mapped.map((entry) => entry.chapter);
  }

  async getChapterList(mangaId: string): Promise<Chapter[]> {
    try {
      let rawChapters: any[] = [];

      try {
        // Primary: api.shinigami.io (supports high safe limit + cursor pagination without 502)
        rawChapters = await this.fetchAllChaptersCursorOrPaged(
          this.apiUrl,
          mangaId,
          [500, 100, 24],
          true
        );
      } catch (primaryError: any) {
        console.warn(
          `[ShinigamiService] Primary chapter upstream failed for ${mangaId}, falling back to ${this.fallbackChapterApiUrl}:`,
          primaryError?.response?.status || primaryError?.message
        );

        // Fallback: api.shngm.io (page-based pagination: try page_size=100, fallback to 24, parallel batches of 6)
        rawChapters = await this.fetchAllChaptersCursorOrPaged(
          this.fallbackChapterApiUrl,
          mangaId,
          [100, 24],
          false
        );
      }

      if (!rawChapters || rawChapters.length === 0) {
        return [];
      }

      return this.normalizeAndSortChapters(rawChapters, mangaId);
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Failed to get chapter list: ${error.response.status} - ${
            error.response.data?.message || error.message
          }`
        );
      }
      throw new Error(`Failed to get chapter list: ${error.message}`);
    }
  }

  async getPageList(chapterId: string): Promise<Page[]> {
    try {
      const response = await this.client.get(
        `${this.apiUrl}/v1/chapter/detail/${chapterId}`
      );

      let pages: string[] = [];
      let baseUrl = "";
      let path = "";

      if (response.data?.data?.chapter) {
        const chapterData = response.data.data;
        baseUrl = chapterData.base_url || chapterData.base_url_low || "";
        path = chapterData.chapter.path || "";
        pages = chapterData.chapter.data || [];
      } else if (response.data?.page_list?.chapter_page) {
        const pageList = response.data.page_list.chapter_page;
        baseUrl = this.cdnUrl;
        path = pageList.path || "";
        pages = pageList.pages || [];
      } else if (response.data?.pages) {
        pages = response.data.pages;
        baseUrl = response.data.base_url || this.cdnUrl;
        path = response.data.path || "";
      } else if (Array.isArray(response.data)) {
        return response.data.map((page: any, index: number) => ({
          index,
          imageUrl: page.image_url || page.url || page,
        }));
      }

      if (!pages || !Array.isArray(pages) || pages.length === 0) {
        throw new Error("Invalid response from API - pages not found or empty");
      }

      return pages.map((page: string, index: number) => ({
        index,
        imageUrl: `${baseUrl}${path}${page}`,
      }));
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Failed to get page list: ${error.response.status} - ${
            error.response.data?.message || error.message
          }`
        );
      }
      throw new Error(`Failed to get page list: ${error.message}`);
    }
  }

  async downloadImage(imageUrl: string): Promise<Buffer> {
    const response = await axios.get(imageUrl, {
      headers: this.getImageHeaders(),
      responseType: "arraybuffer",
    });

    return response.data;
  }
}
