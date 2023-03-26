import { useEffect, useState } from 'react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  style: 'currency',
});

export const Home = () => {
  const [formState, setFormState] = useState({
    name: 'Generic Vending Machine',
    description: 'A generic vending machine for testing purposes.',
    price: '59999',
    currency: 'USD',
    quantity: '1',
    maxQuantity: '10',
  });
  const [subtotal, setSubtotal] = useState(
    parseInt(formState.price) * parseInt(formState.quantity)
  );

  useEffect(() => {
    setSubtotal(parseInt(formState.price) * parseInt(formState.quantity));
  }, [formState.price, formState.quantity]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prevState) => ({ ...prevState, quantity: e.target.value }));
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center">
      <h1 className="text-5xl font-bold mb-6">A Simplified Cart View</h1>
      <p className="mb-8">
        This is a simple simulation of what someone might see when they open a
        cart modal. The step before the Stripe checkout page.
      </p>

      <form method="POST" action="https://checkout-demo.jgude.dev/api/checkout">
        <input className="hidden" name="name" value={formState.name} />
        <input
          className="hidden"
          name="description"
          value={formState.description}
        />
        <input className="hidden" name="price" value={formState.price} />
        <input className="hidden" name="currency" value={formState.currency} />
        <input
          className="hidden"
          name="maxQuantity"
          value={formState.maxQuantity}
        />

        <div className="w-[900px] shadow-lg rounded px-6 py-4 flex items-center border border-gray-300">
          <div className="flex-grow">
            <h2 className="font-bold text-2xl ">{formState.name}</h2>
            <p className=" text-gray-600">{formState.description}</p>
          </div>

          <div className="flex items-center">
            <select
              className="px-2 py-1 rounded border border-gray-400 mr-6"
              value={formState.quantity}
              onChange={handleQuantityChange}
              name="quantity"
            >
              <option value="1">Qty: 1</option>
              <option value="2">Qty: 2</option>
              <option value="3">Qty: 3</option>
              <option value="4">Qty: 4</option>
              <option value="5">Qty: 5</option>
              <option value="6">Qty: 6</option>
              <option value="7">Qty: 7</option>
              <option value="8">Qty: 8</option>
              <option value="9">Qty: 9</option>
              <option value="10">Qty: 10</option>
            </select>
            <p className="font-bold">
              {currencyFormatter.format(parseInt(formState.price) / 100)}
            </p>
          </div>
        </div>

        <span className="w-[900px] flex justify-end mt-8 px-6 text-xl font-bold">
          Subtotal: {currencyFormatter.format(subtotal / 100)}
        </span>

        <span className="w-[900px] flex justify-end px-6 mt-2">
          <button type="submit" className=" bg-sky-400 rounded px-4 py-2">
            Proceed to Checkout
          </button>
        </span>
      </form>
    </div>
  );
};
