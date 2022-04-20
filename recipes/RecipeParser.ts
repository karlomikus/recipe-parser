import {CstNode, CstParser, ILexingResult} from "chevrotain";
import {lex, recipeTokenVocabulary} from "./RecipeLexer";

/* -- ingredients

in ABNF (https://matt.might.net/articles/grammars-bnf-ebnf/)

ingredient_item = [ingredient_item_id 1*whitespace] amount ingredient

white_space = *( " " / "\t" )
ingredient_item_id = ( [ "(" ] number [ "." / ")" / ":" ] ) / ( [ "-" / "*" / "•" ])

amount = [modifier] [white_space] quantity [white_space] [unit] [ "." ]
modifier :== approx / approximately / about / "~" / around
quantity = number / fraction
unit = (cup / tsp / tbsp (.... see units in recipes ui))["."]

ingredient = *word newline
word = 1*("w" / "." / "'" / "(" / ")" / "[" / "]" / "{" / "}" / "-")
newline = "\n" / | "\r\n"

number = integer / decimal / (integer unicode_fraction)
integer :: = 0 / (natural_digit *digit)
decimal :: integer "." 1*digit
fraction = integer "/" natural_digit *digit
natural_digit = 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8 / 9
digit = 0 / natural_digit
unicode_fraction = \u00BC | \u00BD | \u00BE | ...
 */

const {IngredientItemId, Amount, Word, SectionHeader} = recipeTokenVocabulary

export class RecipeParser extends CstParser {
    constructor() {
        super(recipeTokenVocabulary);

        this.performSelfAnalysis()
    }

    // list of ingredients can either have a section header, or an ingredient. if it has
    // a section header, then under that section header, there could be more ingredients
    ingredients = this.RULE("ingredients", () => {
        this.AT_LEAST_ONE({
            DEF: () => {
                this.OR([
                    {
                        GATE: () => this.LA(1).tokenType === SectionHeader, ALT: () => {
                            this.SUBRULE(this.section)
                        }
                    },
                    {ALT: () => this.SUBRULE(this.ingredientItem)}
                ])
            }
        })
    })
    // a section in the ingredient list. for example, the ingredients to make a dough, or a sauce
    section = this.RULE("section", () => {
        this.CONSUME(SectionHeader)
        this.AT_LEAST_ONE({
            DEF: () => {
                this.SUBRULE(this.ingredientItem)
            }
        })
    })
    // an ingredient, possibly as a numbered or bulleted list
    ingredientItem = this.RULE("ingredientItem", () => {
        this.OPTION(() => {
            this.SUBRULE(this.ingredientItemId)
        })
        this.SUBRULE(this.amount)
        this.SUBRULE(this.ingredient)
    })
    // the number or bullet of the list
    ingredientItemId = this.RULE("ingredientItemId", () => {
        this.CONSUME(IngredientItemId)
    })
    // the amount (e.g. 1 cup)
    amount = this.RULE("amount", () => {
        this.CONSUME(Amount)
    })
    // the ingredient (e.g. all-purpose flour)
    ingredient = this.RULE("ingredient", () => {
        this.AT_LEAST_ONE({
            DEF: () => {
                this.CONSUME(Word)
            }
        })
    })
}

const parserInstance = new RecipeParser()

export type RecipeParseResult = {
    parserInstance: RecipeParser,
    cst: CstNode,
    lexingResult: ILexingResult
}

export function parse(input: string): RecipeParseResult {
    const lexingResult = lex(input)

    parserInstance.input = lexingResult.tokens

    const cst = parserInstance.ingredients()

    return {parserInstance, cst, lexingResult}
}