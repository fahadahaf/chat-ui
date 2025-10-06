export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-md border border-primary/15 p-8 text-center">
        <h1 className="text-xl font-medium">Registration Disabled</h1>
        <p className="text-sm text-muted-foreground">
          User registration has been disabled. Please contact an administrator to create an account.
        </p>
        <a 
          href="/login" 
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-black hover:bg-primary/90"
        >
          Back to Login
        </a>
      </div>
    </div>
  )
}


