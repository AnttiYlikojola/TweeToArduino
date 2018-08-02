(function () {

    /* 
        Entweedle story format to JSON
        Author: Antti Ylikojola, https://www.github.com/AnttiYlikojola    

        This script creates array of objects from TwineStory Entweedle story format

        Script has 3 main parts

        1. Importing story from file and using cheerio library and split method to get every passage to its own element in array
        2. Regexing every statement to its own element in array
        3. Creating object with passageName(header) + every statement in passage

    */

    "use strict";
    const cheerio = require("cheerio");
    const Promise = require("bluebird");
    const fs = require("fs");

    const compileArduinoCode = require("./ArduinoCompiler") //code that makes the C code for arduino

    const storyFileName = "ohjaustarina1.html"; // tweestory
    let startPassage;
    let parsedHtml = []
    let htmlString;
    let sets = [];
    let tweeJSON = []; // Final output
    /* 
    Regular expression for finding:
    closed parenthesis (for goto, live, move, set, 
    closed double square brackets (for links), 
    closed square brackets (for if/elseif/else true actions), 
    sentences ending in newline/dot/question mark/exclamation mark/whitespace/left round bracket/left square bracket (for passagetexts)
    */

    const regExp = /\(([^)]+)\)|(\[\[(.*?)\]\])|\[([^\]]*)\]|([^ \r\n][^!?\.|(|[\r\n]+[\w!?\.]+)/g;

    /* 
        Read html and parse twee story with cheerio module. 
    */
    fs.readFile(storyFileName, "utf-8", function(err, contents){
        const $ = cheerio.load(contents)
        // element with id #output has the content. Everything before ":: UserStylesheet[stylesheet]" is useless
        htmlString = $("#output").contents()["0"].data.split(":: UserStylesheet[stylesheet]")[1];
        startPassage = $("tw-storydata").attr("startnode");
        
        main(htmlString);
    })

    /* 
        Iterate through Twee format, every passage is separated with ":: " (split)

    */ 
    const main = (htmlString) => {


        const passages = htmlString.split(":: ");     // Split from every passage name
        for (let passagesIndex = 1; passagesIndex < passages.length; passagesIndex++) {

            let onePassage = { passageHeader: "", passageText: [] };

            //Passage header is on the first line
            onePassage.passageHeader = passages[passagesIndex].split("\n")[0];
            //Passage data is the rest of the string
            let passageString = passages[passagesIndex].replace(/\n|\t/g, "").substring(onePassage.passageHeader.length);

            onePassage.passageText = parseStatements(passageString);
            parsedHtml.push(onePassage);
        }
        console.log(parsedHtml)
        parsePassages(parsedHtml);
    }
    const parseStatements = (passageString) =>{

        let currentString = "";
        let opened = "";
        let openedCounter = 0;
        let closedCounter = 0;
        let passageText = []

        for(var j = 0; j < passageString.length; j++){

            if(passageString[j] == "[" || passageString[j] == "(" || passageString[j] + passageString[j +1] == "[["){
                openedCounter++;
            }else if(passageString[j] + passageString[j +1] == "]]" || passageString[j] == "]" || passageString[j] == ")"){
                closedCounter++;
            }

            if(passageString[j] + passageString[j +1] == "[[" && opened.length == 0){
                opened = "[[";
                if(currentString.length > 0){
                    passageText.push(currentString);
                }
                currentString = passageString[j] + passageString[j +1];
                j++;
            }else if(passageString[j] == "[" && opened.length == 0){
                opened = "[";
                if(currentString.length > 0){
                    passageText.push(currentString);
                }
                currentString = passageString[j];
            }else if(passageString[j] == "(" && opened.length == 0){
                opened = "(";
                if(currentString.length > 0){
                    passageText.push(currentString);
                }
                currentString = passageString[j];
            }else if(passageString[j] + passageString[j +1] == "]]" && opened == "[[" && closedCounter == openedCounter){
                opened = "";
                currentString += passageString[j] + passageString[j +1];
                passageText.push(currentString);
                currentString = "";
                j++;
            }else if(passageString[j] == "]" && opened == "[" && closedCounter == openedCounter){
                opened = "";
                currentString += passageString[j];
                passageText.push(currentString);
                currentString = "";
            }else if(passageString[j] == ")" && opened == "(" && closedCounter == openedCounter){
                opened = "";
                currentString += passageString[j];
                passageText.push(currentString);
                currentString = "";
            }else{
                currentString += passageString[j];
            }
            
        }
        return passageText;
    }

    let i = 0; //index of passages
    let ii = 0; // index of every action in one passage

    /* 
        Iterating through all passages and passage actions  
    */
    const parsePassages = (parsedHtml) => {
        for (i = 0; i < parsedHtml.length; i++) {
            let tweeJSONPassage = {
                header: parsedHtml[i].passageHeader.replace(/ä/g, "\x84").replace(/Ä/g, "\8E").replace(/ö/g, "\x94").replace(/Ö/g, "\x99"), //passages header
                passage: [] // statements
            }
            for (ii = 0; ii < parsedHtml[i].passageText.length; ii++) {

                let statementType = parsedHtml[i].passageText[ii].split(" ")[0]
                let oneStatement = parsedHtml[i].passageText[ii];

                tweeJSONPassage.passage.push(sortStatement(statementType, oneStatement))

            }
            tweeJSON.push(tweeJSONPassage);
        }        

        var flags = {};
        /* Getting first unique variablenames for declaration in ArduinoCompiler */
        tweeJSON.uniqueSets = sets.filter(function(entry) {
            if (flags[entry.variableName]) {
                return false;
            }
            flags[entry.variableName] = true;
            return true;
        });
        // check starting passage
        if(startPassage > 1){
            tweeJSON.unshift(tweeJSON[startPassage -1]);
            tweeJSON.splice(startPassage, 1);
        }

        console.log(JSON.stringify(tweeJSON, null, 3))
        compileArduinoCode(tweeJSON);
    };
    /* 
        Check statement type
        return object with statement type and actions of it 
    */ 
   
    const sortStatement = (statementType, oneStatement) => {
        if (statementType === "(set:") {
            let set = setStatement(oneStatement);
            sets.push({variableName:set.variable, value:set.value});
            return set;
        } else if (statementType === "(if:" || statementType === "(else-if:") {
            ii++;
            return conditionalStatement(oneStatement, parsedHtml[i].passageText[ii]);
        } else if (statementType === "(else:)") {
            ii++;
            return elseStatement(parsedHtml[i].passageText[ii]);
        } else if (statementType === "(live:") {
            return liveStatement(oneStatement);
        } else if (statementType === "(move") {
            return moveStatement(oneStatement);
        } else if (statementType == "(face"){
            return faceStatement(oneStatement);
        } else if (statementType === "(goto:") {
            return gotoStatement(oneStatement);
        } else if (statementType[0] + statementType[1] === "[[") {
            return linkCommand(oneStatement);
        } else {
            return passageText(oneStatement);
        }
    }

    /* 
        Each statement is saved as object

     */
    const moveStatement = (statement) => {
        return {
            statement: "move",
            transition: statement.split(" ")[1].replace(")", "")
        }
    };
    const faceStatement = (statement) =>{
        return {
            statement: "face",
            expression: statement.split(" ")[1].replace(")", "")
        }
    }
    const conditionalStatement = (statementString, conditionalActions) => {
        let statement = statementString.split(" ")[0].replace(/\(/, "");
        let condition = statementString.split(statement)[1].replace(/\s\$|/g, "").replace(")", "");
        let conditionalStatementObject = {
            statement: statement,
            condition:condition,
            conditionalActions: []
        }
        let actions = conditionalActions.slice(1, -1).match(regExp);
        console.log(actions)
        for(var a = 0; a < actions.length; a++){
            if(actions[a].split(" ")[0] == "(if:" || actions[a].split(" ")[0] == "(else-if:)"){
                conditionalStatementObject.conditionalActions.push(conditionalStatement(actions[a], actions[a +1]));
                a++;
            }else if(actions[a] == "(else:)"){
                conditionalStatementObject.conditionalActions.push(elseStatement(actions[a +1]));
                a++;           
            }else{
                conditionalStatementObject.conditionalActions.push(sortStatement(actions[a].split(" ")[0], actions[a]));
            }
        }
        return conditionalStatementObject;
    };
    const elseStatement = (elseActions) => {

        let elseStatementObject = {
            statement: "else",
            conditionalActions: []
        }
        for (let o = 0; o < elseActions.slice(1, -1).match(regExp).length; o++) {
            let statementType = elseActions.slice(1, -1).match(regExp)[o].split(" ")[0]
            let oneStatement = elseActions.slice(1, -1).match(regExp)[o];
            elseStatementObject.conditionalActions.push(sortStatement(statementType, oneStatement));
        }
        return elseStatementObject;
    };   
    const setStatement = (statement) => {
        let splitStatement = statement.split(" ");
        return {
            statement: "set",
            variable: splitStatement[1].replace("$", ""),
            operator: splitStatement[2],
            value: statement.substring(statement.indexOf("=") + 2).replace(/[\)\s]/g, "")
        };
    };
    const liveStatement = (statement) => {
    };
    const gotoStatement = (statement) => {
        return {
            statement: "goto",
            value: statement.split(" ")[1].replace(/[\)\s"]/g, "")
        }
    };
    const linkCommand = (command) => {
        let bracketsRemoved = command.replace(/\[\[|\]\]/g, "");
        if (bracketsRemoved.split("->").length > 1) {
            return {
                statement: "link",
                linkText: bracketsRemoved.split("->")[0],
                link: bracketsRemoved.split("->")[1].replace(/ä/g, "\x84").replace(/Ä/g, "\8E").replace(/ö/g, "\x94").replace(/Ö/g, "\x99")
            }
        } else if (bracketsRemoved.split("<-").length > 1) {
            return {
                statement: "link",
                linkText: bracketsRemoved.split("<-")[0],
                link: bracketsRemoved.split("<-")[1].replace(/ä/g, "\x84").replace(/Ä/g, "\8E").replace(/ö/g, "\x94").replace(/Ö/g, "\x99")
            }
        } else {
            return {
                statement: "link",
                link: bracketsRemoved.replace(/ä/g, "\x84").replace(/Ä/g, "\8E").replace(/ö/g, "\x94").replace(/Ö/g, "\x99")
            }
        }
    };
    const passageText = (text) => {
        return {
            statement: "passageText",
            text: text.replace(/ä/g, "\x84").replace(/Ä/g, "\8E").replace(/ö/g, "\x94").replace(/Ö/g, "\x99")
        };
    }
    

})();