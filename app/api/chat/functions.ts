import { endOfDay, interval, isWithinInterval, startOfDay } from "date-fns";
import { ChatCompletionCreateParams } from "openai/resources/chat/index";

export const functions: ChatCompletionCreateParams.Function[] = [
  {
    name: "get_forecast",
    description:
      "Given a list of longitude and latitude, and a date in the future, provides real-time weather forecasts",
    parameters: {
      type: "object",
      properties: {
        coordinates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              lat: {
                type: "string",
                description: "Latitude",
              },
              lon: {
                type: "string",
                description: "Longitude",
              },
            },
          },
        },
        date: {
          type: "string",
          description: "Date",
        },
      },
      required: ["lat", "lon", "date"],
    },
  },
  // {
  //   name: "geolocate_place",
  //   description: "Convert a city name into latitude and longitude",
  //   parameters: {
  //     type: "object",
  //     properties: {
  //       name: {
  //         type: "string",
  //         description: "The name of the city.",
  //       },
  //     },
  //     required: ["name"],
  //   },
  // },
];

async function get_forecast(args: {
  coordinates: { lat: string; lon: string }[];
  date: string;
}) {
  console.log("hello from get_forecast", args);
  const answers = [];
  const date_start = startOfDay(new Date(args.date));
  const date_end = endOfDay(new Date(args.date));

  for (const coordinates of Object.values(args.coordinates)) {
    const timeseries = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${coordinates.lat}&lon=${coordinates.lon}`,
    )
      .then((r) => r.json())
      .then((list) => list["properties"]["timeseries"]);

    const forecast = timeseries
      .filter((series: any) => {
        const date = new Date(series.time);
        return isWithinInterval(date, interval(date_start, date_end));
      })
      .map((series) => series.data.instant);

    answers.push({
      coordinates,
      forecast,
    });
  }

  return {
    description: "Weather forecast for the given date and coordinates",
    answers,
  };
}

export async function runFunction(name: string, args: any) {
  switch (name) {
    case "get_forecast":
      return await get_forecast(args);
    default:
      return null;
  }
}
