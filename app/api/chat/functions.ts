import { endOfDay, interval, isWithinInterval, startOfDay } from "date-fns";
import { ChatCompletionCreateParams } from "openai/resources/chat/index";

export const functions: ChatCompletionCreateParams.Function[] = [
  {
    name: "get_forecast",
    description:
      "Given a coordinate with a latitude and longitude and a date in the future, provides real-time weather forecasts",
    parameters: {
      type: "object",
      properties: {
        coordinate: {
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
        date: {
          type: "string",
          description: "Date",
        },
      },
      required: ["lat", "lon", "date"],
    },
  },
];

export const tools = [
  {
    type: "function",
    function: {
      ...functions[0],
    },
  },
];

export async function get_forecast(args: {
  coordinate: { lat: string; lon: string };
  date: string;
}) {
  console.log("hello from get_forecast", args);
  const date_start = startOfDay(new Date(args.date));
  const date_end = endOfDay(new Date(args.date));

  const timeseries = await fetch(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${args.coordinate.lat}&lon=${args.coordinate.lon}`,
  )
    .then((r) => r.json())
    .then((list) => list["properties"]["timeseries"]);

  const forecast = timeseries
    .filter((series: any) => {
      const date = new Date(series.time);
      return isWithinInterval(date, interval(date_start, date_end));
    })
    .map((series) => series.data.instant);

  return {
    description: "Weather forecast for the given date and coordinates",
    forecast,
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
