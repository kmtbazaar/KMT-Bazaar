import { Redirect, Href } from "expo-router";

export default function Index() {
  return <Redirect href={"/auth/login" as Href} />;
}