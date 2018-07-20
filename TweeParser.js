(function () {

    /* 
        Entweedle story format to JSON
        Author: Antti Ylikojola, https://www.github.com/AnttiYlikojola    

        This script creates array of objects from TwineStory Entweedle story format

        Script has 3 main elements

        1. Importing story from file and using cheerio library and split method to get every passage to its own element in array
        2. Regexing every statement to its own element in array
        3. Creating object with passageName(header) + every statement in passage

    */

    "use strict";
    const cheerio = require("cheerio");
    const Promise = require("bluebird");
    const fs = Promise.promisifyAll(require("fs"));

    const compileArduinoCode = require("./ArduinoCompiler") //code that makes the C code for arduino

    const storyFileName = "ohjaustarina2.html"; // tweestory
    let parsedHtml = []
    let htmlString;
    let sets = [];

    /* 
    Regular expression for finding:
    closed parenthesis (for goto, live, move, set, 
    closed double square brackets (for links), 
    closed square brackets (for if/elseif/else true actions), 
    sentences ending in newline/dot/question mark/exclamation mark/whitespace/left round bracket/left square bracket (for passagetexts)
    */

    const regExp = /\(([^)]+)\)|(\[\[(.*?)\]\])|\[([^\]]*)\]|([^ \r\n][^!?\.|(|[\r\n]+[\w!?\.]+)/g;

    const matchEquations = /(?:\$\w+|\d+)?[><+*/-] ?(?: ?(?:\$\w+|\d+) ??[><+*/-]?)*/g;
    const matchVariables = /\$(.\S*)/g;
    /* 
        Read html and parse needed content with cheerio module. 
    */

    fs.readFileAsync(storyFileName, "utf-8").then(contents => {
        const $ = cheerio.load(contents)
        // element with id #output has the content. Everything before ":: UserStylesheet[stylesheet]" is useless
        htmlString = $("#output").contents()["0"].data.split(":: UserStylesheet[stylesheet]")[1];
        main(htmlString);
    }).catch(e => {
        main(htmlString);
        console.log("Found error somewhere in the code " + e);
    });

    /* 
    Iterate through Twee format, every passage is separated with ":: " (split)
    After that we regex every action to its own element in array 
    */ 
    const main = (htmlString) => {


        const passages = htmlString.split(":: ");     // Split from every passage name

        for (let passagesIndex = 1; passagesIndex < passages.length; passagesIndex++) {

            let onePassage = { passageHeader: "", passageText: [] };

            //Passage header is on the first line
            onePassage.passageHeader = passages[passagesIndex].split("\n")[0];
            //Passage data is the rest of the string
            let passageString = passages[passagesIndex].replace(/\n/g, "").substring(onePassage.passageHeader.length);
            let onePassageText = passageString.match(regExp)
            onePassage.passageText = onePassageText;
            parsedHtml.push(onePassage);
        }
        parsePassages(parsedHtml);
    }

    let i = 0; //index of passages
    let ii = 0; // index of every action in one passage

    /* 
        Iterating through all passages and passage actions  
    */
    const parsePassages = (parsedHtml) => {

        let tweeJSON = []

        for (i = 0; i < parsedHtml.length; i++) {
            let tweeJSONPassage = {
                header: parsedHtml[i].passageHeader, //passages header
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
        /* Getting first unique variablename for declaration in ArduinoCompiler */
        tweeJSON.uniqueSets = sets.filter(function(entry) {
            if (flags[entry.variableName]) {
                return false;
            }
            flags[entry.variableName] = true;
            return true;
        });

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
        } else if (statementType === "(if:") {
            ii++;
            return conditionalStatement(oneStatement, parsedHtml[i].passageText[ii]);
        } else if (statementType === "(else-if:") {
            ii++;
            return conditionalStatement(oneStatement, parsedHtml[i].passageText[ii]);
        } else if (statementType === "(else:)") {
            ii++;
            return elseStatement(parsedHtml[i].passageText[ii]);
        } else if (statementType === "(live:") {
            return liveStatement(oneStatement);
        } else if (statementType === "(move") {
            return moveStatement(oneStatement);
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
    const conditionalStatement = (statementString, conditionalActions) => {
        let statement = statementString.split(" ")[0].replace(/\(/, "");
        let condition = statementString.split(statement)[1].replace(/\s\$|/, "").replace(")", "");
        let conditionalStatementObject = {
            statement: statement,
            condition:condition,
            conditionalActions: []
        }
        for (let o = 0; o < conditionalActions.slice(1, -1).match(regExp).length; o++) {
            let statementType = conditionalActions.slice(1, -1).match(regExp)[o].split(" ")[0]
            let oneStatement = conditionalActions.slice(1, -1).match(regExp)[o];
            conditionalStatementObject.conditionalActions.push(sortStatement(statementType, oneStatement));
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
                link: bracketsRemoved.split("->")[1]
            }
        } else if (bracketsRemoved.split("<-").length > 1) {
            return {
                statement: "link",
                linkText: bracketsRemoved.split("<-")[0],
                link: bracketsRemoved.split("<-")[1]
            }
        } else {
            return {
                statement: "link",
                link: bracketsRemoved
            }
        }
    };
    const passageText = (text) => {
        return {
            statement: "passageText",
            text: text
        };
    }
})();