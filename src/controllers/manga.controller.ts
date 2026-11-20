import { Request, Response } from "express";
import { ShinigamiService } from "../services/shinigami.service";
import { ApiResponse } from "../types/manga.types";

export class MangaController {
  private shinigamiService: ShinigamiService;

  constructor() {
    this.shinigamiService = new ShinigamiService();
  }

  getPopularManga = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const result = await this.shinigamiService.getPopularManga(page);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      res.status(500).json(response);
    }
  };

  getLatestUpdates = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const result = await this.shinigamiService.getLatestUpdates(page);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      res.status(500).json(response);
    }
  };

  searchManga = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;

      if (!query) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Query parameter "q" is required',
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.shinigamiService.searchManga(query, page);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      res.status(500).json(response);
    }
  };

  getMangaDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { mangaId } = req.params;

      if (!mangaId) {
        const response: ApiResponse<null> = {
          success: false,
          error: "Manga ID is required",
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.shinigamiService.getMangaDetails(mangaId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      res.status(500).json(response);
    }
  };

  getChapterList = async (req: Request, res: Response): Promise<void> => {
    try {
      const { mangaId } = req.params;

      if (!mangaId) {
        const response: ApiResponse<null> = {
          success: false,
          error: "Manga ID is required",
        };
        res.status(400).json(response);
        return;
      }

      const rawPage =
        typeof req.query.page === "string" ? req.query.page.trim() : "";
      const rawLimit =
        typeof req.query.limit === "string" ? req.query.limit.trim() : "";

      const hasPagination = rawPage.length > 0 || rawLimit.length > 0;
      let page = 1;
      let limit: number | null = null;

      if (hasPagination) {
        if (rawPage.length > 0) {
          if (!/^\d+$/.test(rawPage) || parseInt(rawPage, 10) < 1) {
            const response: ApiResponse<null> = {
              success: false,
              error: 'Query parameter "page" must be a positive integer',
            };
            res.status(400).json(response);
            return;
          }
          page = parseInt(rawPage, 10);
        }

        if (rawLimit.length > 0) {
          if (!/^\d+$/.test(rawLimit) || parseInt(rawLimit, 10) < 1) {
            const response: ApiResponse<null> = {
              success: false,
              error: 'Query parameter "limit" must be a positive integer',
            };
            res.status(400).json(response);
            return;
          }
          limit = parseInt(rawLimit, 10);
        } else {
          limit = 50;
        }
      }

      const allChapters = await this.shinigamiService.getChapterList(mangaId);
      const total = allChapters.length;

      let result = allChapters;
      let totalPage = total > 0 ? 1 : 0;

      if (hasPagination && limit !== null) {
        totalPage = total > 0 ? Math.ceil(total / limit) : 0;
        const startIndex = (page - 1) * limit;
        result = allChapters.slice(startIndex, startIndex + limit);
      }

      res.setHeader(
        "Cache-Control",
        "s-maxage=300, stale-while-revalidate=600"
      );

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        meta: {
          total,
          page,
          totalPage,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      res.status(500).json(response);
    }
  };

  getPageList = async (req: Request, res: Response): Promise<void> => {
    try {
      const { chapterId } = req.params;

      if (!chapterId) {
        const response: ApiResponse<null> = {
          success: false,
          error: "Chapter ID is required",
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.shinigamiService.getPageList(chapterId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      res.status(500).json(response);
    }
  };

  downloadImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const imageUrl = req.query.url as string;

      if (!imageUrl) {
        const response: ApiResponse<null> = {
          success: false,
          error: "Image URL is required",
        };
        res.status(400).json(response);
        return;
      }

      const imageBuffer = await this.shinigamiService.downloadImage(imageUrl);

      res.set("Content-Type", "image/jpeg");
      res.send(imageBuffer);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      res.status(500).json(response);
    }
  };
}
