//jshint esversion:6
// require modules
// require e config do dotenv
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

// create app
const app = express();

// set up ejs engine
app.set("view engine", "ejs");

// app uses
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

///////////////////////////////////
//      CREATE TO MONGODB
mongoose.connect(process.env.DB_HOST, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

/////////////////////////
//   ITENS SCHEMA
const itemsSchema = new mongoose.Schema({
  name: String,
});

/////////////////////////
//   MODEL
const Item = mongoose.model("Item", itemsSchema);

////////////////////////////
//    CREATE DOCUMENT
const item1 = new Item({
  name: "Bem-Vindo a sua lista de afazeres!",
});

const item2 = new Item({
  name: "Aperte o botão + para add novo item",
});

const item3 = new Item({
  name: "<-- Aperte no check para deletar um item",
});

// array com itens default
const defaultItems = [item1, item2, item3];

//////////////////////////////
//      LIST SCHEMA
// para quando criado novo ejs custom list
const listSchema = {
  name: String,
  items: [itemsSchema],
};

//////////////////////////////
//    MODEL LIST SCHEMA
const List = mongoose.model("List", listSchema);

/////////////////////////
//    GET HOME ROUTE
app.get("/", function (req, res) {
  //+++++++++++++++++++++++++++
  //    MONGOOSE FIND()
  //+++++++++++++++++++++++++++
  Item.find({}, (err, itemsEncontrados) => {
    if (itemsEncontrados.length === 0) {
      //     MONGOOSE INSERTMANY()
      //     se nao tem nenum item no array items encontrados
      //     usamos insertmany para popular o todolist
      //+++++++++++++++++++++++++++++++++
      Item.insertMany(defaultItems, (err) => {
        if (err) {
          console.log(err);
        } else {
          console.log("Itens default inseridos no DB");
        }
      });
      // este redirect vai entrar no if e checar se existe items na nossa collection
      // se nao houver ele vai insertMany
      // se houver ele vai direto para render.
      res.redirect("/");
    } else {
      res.render("list", { listTitle: "Hoje", newListItems: itemsEncontrados });
    }
  });
});

/////////////////////////
//  GET ROUTE PARAMETERS
//  CUSTOM REQUEST
app.get("/:customListName", function (req, res) {
  // constante para armazenar custom route param
  const customListName = _.capitalize(req.params.customListName);

  // CHECAR SE JA EXISTE UM DOCUMENT
  // DENTRO DA COLLECTION ROUTE PARAMETER CRIADA
  List.findOne({ name: customListName }, (err, foundList) => {
    if (!err) {
      if (!foundList) {
        // Cria a nova lista
        //++++++++++++++++++++++
        // CRIA NOVA LIST
        // o nome da lista sera o que o user escrever na route parameteres
        //++++++++++++++++++++++
        const list = new List({
          name: customListName,
          items: defaultItems,
        });
        // salvar a nova list collection no mongodB
        list.save();
        // redireciona para nova lista criada na route parameters
        res.redirect("/" + customListName);
      } else {
        // Mostra a lista existente
        res.render("list", {
          listTitle: foundList.name,
          newListItems: foundList.items,
        });
      }
    }
  });
});

/////////////////////////
//    POST HOME ROUTE
app.post("/", function (req, res) {
  // pega item inserido e armazena em const
  const novoItem = req.body.newItem;
  // nome da lista listTitle
  const listName = req.body.list;

  // cria novo item para ser inserido na route param tratada
  // atraves do listName
  const addNovoItem = new Item({
    name: novoItem,
  });

  // if para validar onde vai ser inserido item
  // de acordo com a route parameter acessada
  if (listName === "Hoje") {
    // adiciona novo item na collection
    addNovoItem.save();
    // redireciona para home route para mostrar os items atualizados
    res.redirect("/");
  } else {
    // mongoose findOne para adicionar item na lista correta
    List.findOne({ name: listName }, (err, foundList) => {
      foundList.items.push(addNovoItem);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

/////////////////////////
//    POST DELETE ROUTE
app.post("/delete", (req, res) => {
  // pega checkbox com value do id do item checado
  const itemIdRemover = req.body.checkbox;
  const listName = req.body.listName;

  // checar se vamos deletar a o item da listName correta
  if (listName === "Hoje") {
    Item.findByIdAndRemove(itemIdRemover, (err) => {
      if (!err) {
        console.log("Item removido com sucesso!!");
        res.redirect("/");
      }
    });
  } else {
    List.findOneAndUpdate(
      { name: listName },
      { $pull: { items: { _id: itemIdRemover } } },
      (err, foundList) => {
        if (!err) {
          res.redirect("/" + listName);
        }
      }
    );
  }
});

//    GET ABOUT ROUTE
app.get("/about", function (req, res) {
  res.render("about");
});

//  APP LISTEN
let port = process.env.PORT;
if (port == null || "") {
  port = 3000;
}

app.listen(port, () => {
  console.log("Servidor rodando com sucesso!!");
});
