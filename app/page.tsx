import { log } from "console";
import Image from "next/image";
import { Appbar } from "./components/Appbar";


export default function Home() {
  console.log(process.env.GOOGLE_CLIENT_ID)
  console.log("heello dev");
  return (
    <main>
      
    <Appbar />
      <h2>hello world</h2>
    </main>
  );
}
