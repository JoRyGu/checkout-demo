export const Success = () => {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center">
      <h1 className="text-5xl font-bold mb-6">Success!</h1>
      <p>
        Check out the{' '}
        <a
          className=" text-blue-500"
          href="https://checkout-demo.jgude.dev/admin"
          target="_blank"
          rel="noopener noreferrer"
        >
          admin panel
        </a>{' '}
        to see the seller's view of this transaction!
      </p>
    </div>
  );
};
