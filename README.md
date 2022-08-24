# cdk-playground

## restapi-lambda-dynamo (ts)

* cdk deploy RestApiLambdaDynamo

Exemplo de arquitetura básica com API Gateway (REST) -> Lambda (TS) -> DynamoDB

exemplo de payload para o POST
```json
{
  "id": "as3dfgrs",
  "nome": "Marcio"
}
```

![gtw-lmb-dynDB](/imagens/gateway-lambda-dynamodb.jpg)

<hr />

## restapi-stepfunctions-express-sync (ts)

* cdk deploy RestApiStepFunctionsExpressSync

```json
{
  "str": "str",
  "num": 1,
  "strLst": ["unica","repetida","repetida"],
  "strSet": ["unica","nao-pode-repetir"],
  "pk": "partition-key",
  "map": {
    "strMap": "str",
    "numMap": 2
  },
  "numLst": [1,2,1],
  "mapLst": [
    { "str": "str1", "num": 1 },
    { "str": "str2", "num": 2 }
  ],
  "bool": true,
  "convertToBinary": "Converte para binario"
}
```
