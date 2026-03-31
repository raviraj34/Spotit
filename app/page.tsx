import { log } from "console";
import Image from "next/image";
import { Appbar } from "./components/Appbar";
import StreamQLanding from "./components/LandingPage";


export default function Home() {
  console.log(process.env.GOOGLE_CLIENT_ID)
  console.log("heello dev");
  return (
    <main>
      <StreamQLanding />
    </main>
  );
}
