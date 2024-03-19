import { CompletionCreateParams } from "openai/resources/chat/index";

export const functions: CompletionCreateParams.Function[] = [
  {
    name: "get_forecast",
    description:
      "Grants access to real-time weather forecast data for a pair of latitude and longitude",
    parameters: {
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
      required: [],
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

async function get_forecast(args: { lat: string; lon: string }) {
  console.log("hello from get_forecast", args);
  const answer = await fetch(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${args.lat}&lon=${args.lon}`,
  )
    .then((r) => r.json())
    .then((list) => list["properties"]["timeseries"].slice(0, 20));

  return {
    description: "Weather forecast for tomorrow",
    answer,
  };
}

// async function geolocate_place() {
//   console.log("hello from geolocate_place");
//   const answer = await fetch(
//     "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=60.10&lon=9.58",
//   )
//     .then((r) => r.json())
//     .then((list) => list["properties"]["timeseries"][0]);
//   console.debug(answer);
//   return {
//     description: "Weather forecast for tomorrow",
//     answer,
//   };
// }

export async function runFunction(name: string, args: any) {
  switch (name) {
    case "get_forecast":
      return await get_forecast(args);
    default:
      return null;
  }
}
