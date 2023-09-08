import AWS from "aws-sdk";
import { v4 } from "uuid";
import * as yup from "yup";

const schema = yup.object().shape({
  name: yup.string().required(),
  category: yup.string().required(),
  price: yup.number().required(),
  available: yup.bool().required(),
});
// (helloWorld();)
const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "ProductsTable";

const headers = {
  "Content-Type": "application/json",
};

class HttpError extends Error {
  constructor(statusCode, body) {
    super(JSON.stringify(body));
  }
}

const fetchProductById = async (id) => {
  const product = await docClient
    .get({
      TableName: TABLE_NAME,
      Key: {
        productId: id,
      },
    })
    .promise();

  if (!product?.Item) {
    throw new HttpError(404, { error: "Not Found" });
  }

  return product.Item;
};

const handleError = (error) => {
  if (error instanceof yup.ValidationError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        errors: error.errors,
      }),
    };
  }

  if (error instanceof SyntaxError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Invalid request body format: "${error.message}"` }),
    };
  }

  if (error instanceof HttpError) {
    return {
      statusCode: error.statusCode,
      headers,
      body: error.message,
    };
  }

  throw error;
};

export const createProduct = async (event) => {
  try {
    const reqBody = JSON.parse(event.body);

    const schema = yup.object().shape({
      name: yup.string().required(),
      category: yup.string().required(),
      price: yup.number().required(),
      available: yup.bool().required(),
    });
    await schema.validate(reqBody, { abortEarly: false });

    const product = {
      ...reqBody,
      productId: v4(),
    };

    await docClient
      .put({
        TableName: TABLE_NAME,
        Item: product,
      })
      .promise();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(product, null, 2),
    };
  } catch (error) {
    return handleError(error);
  }
};

export const getProduct = async (event) => {
  try {
    const id = event.pathParameters?.id;

    const product = await fetchProductById(id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(product),
    };
  } catch (error) {
    return handleError(error);
  }
};

export const updateProduct = async (event) => {
  try {
    const id = event.pathParameters?.id;

    await fetchProductById(id);

    const reqBody = JSON.parse(event.body);
    await schema.validate(reqBody, { abortEarly: false });
    const productBody = {
      ...reqBody,
      productId: id,
    };

    await docClient
      .put({
        TableName: TABLE_NAME,
        Item: productBody,
      })
      .promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        productBody,
      }),
    };
  } catch (error) {
    return handleError(error);
  }
};

export const deleteProduct = async (event) => {
  try {
    const id = event.pathParameters?.id;
    await fetchProductById(id);
    await docClient
      .delete({
        TableName: TABLE_NAME,
        Key: { productId: id },
      })
      .promise();

    return {
      statusCode: 204,
      headers,
      body: "",
    };
  } catch (error) {
    return handleError(error);
  }
};

export const listProduct = async (event) => {
  try {
    const products = await docClient
      .scan({
        TableName: TABLE_NAME,
      })
      .promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(products.Items),
    };
  } catch (error) {
    return handleError(error);
  }
};
