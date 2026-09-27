import Image from "next/image";

export function UnderConstruction() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-5 py-12 text-center">
        <div className="mb-8 flex items-center justify-center">
          <Image
            src="/evercaremed_logo.png"
            alt="EvercareMed"
            width={180}
            height={80}
            priority
            className="h-auto w-44 object-contain"
          />
        </div>

        <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Under Construction
        </p>
        <h1 className="text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">
          We are preparing your Ayurvedic wellness store
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          Our website is being updated right now. Please check back soon.
        </p>
      </div>
    </main>
  );
}
