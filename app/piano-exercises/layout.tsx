export default function PianoExercisesLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="page">
      <header className="masthead">
        <h1>
          Piano Exercises <span>for Guitar</span>
        </h1>
      </header>
      {children}
    </main>
  );
}
