import { OpenAPIV3 } from "openapi-types";

export const swaggerDocument: OpenAPIV3.Document = {
  openapi: "3.0.0",
  info: {
    title: "NASA NeoWs Proxy API",
    version: "1.0.0",
    description: `
Proxy server for NASA Near Earth Object Web Service.

Особенности:
- Кеширование через Vercel Edge Cache
- Поддержка параметров startDay и endDay
- Детальный эндпоинт для получения информации об астероиде
`
  },
  servers: [
    {
      url: process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"
    }
  ],
  components: {
    schemas: {
      Diameter: {
        type: "object",
        properties: {
          estimated_diameter_min: {
            type: "number",
            example: 0.127
          },
          estimated_diameter_max: {
            type: "number",
            example: 0.284
          }
        }
      },

      CloseApproach: {
        type: "object",
        properties: {
          close_approach_date: {
            type: "string",
            format: "date",
            example: "2025-03-01"
          },
          relative_velocity: {
            type: "object",
            properties: {
              kilometers_per_hour: {
                type: "string",
                example: "24876.123"
              }
            }
          },
          miss_distance: {
            type: "object",
            properties: {
              kilometers: {
                type: "string",
                example: "5423123.12"
              }
            }
          }
        }
      },

      Asteroid: {
        type: "object",
        properties: {
          id: {
            type: "string",
            example: "3726710"
          },
          name: {
            type: "string",
            example: "(2015 RC)"
          },
          absolute_magnitude_h: {
            type: "number",
            example: 22.1
          },
          is_potentially_hazardous_asteroid: {
            type: "boolean",
            example: false
          },
          estimated_diameter: {
            type: "object",
            properties: {
              kilometers: {
                $ref: "#/components/schemas/Diameter"
              }
            }
          },
          close_approach_data: {
            type: "array",
            items: {
              $ref: "#/components/schemas/CloseApproach"
            }
          }
        }
      },

      AsteroidFeedResponse: {
        type: "object",
        properties: {
          element_count: {
            type: "number",
            example: 42
          },
          near_earth_objects: {
            type: "object",
            additionalProperties: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Asteroid"
              }
            }
          }
        }
      },

      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "string",
            example: "Internal server error"
          }
        }
      }
    }
  },
  paths: {
    "/api/asteroids": {
      get: {
        summary: "Получить список астероидов",
        description: `
Возвращает список околоземных объектов (Near Earth Objects) 
за указанный диапазон дат.

Если параметры не переданы — используется текущая дата.
`,
        parameters: [
          {
            name: "startDay",
            in: "query",
            required: false,
            schema: {
              type: "string",
              format: "date"
            },
            description: "Начальная дата в формате YYYY-MM-DD"
          },
          {
            name: "endDay",
            in: "query",
            required: false,
            schema: {
              type: "string",
              format: "date"
            },
            description: "Конечная дата в формате YYYY-MM-DD"
          }
        ],
        responses: {
          "200": {
            description: "Успешный ответ со списком астероидов",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AsteroidFeedResponse"
                }
              }
            }
          },
          "500": {
            description: "Ошибка сервера",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },

    "/api/asteroids/{id}": {
      get: {
        summary: "Получить подробную информацию об астероиде",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string"
            },
            description: "NASA ID астероида"
          }
        ],
        responses: {
          "200": {
            description: "Детальная информация об астероиде",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Asteroid"
                }
              }
            }
          },
          "404": {
            description: "Астероид не найден"
          },
          "500": {
            description: "Ошибка сервера",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    }
  }
};