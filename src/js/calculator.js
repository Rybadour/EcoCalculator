import React, {Fragment} from 'react';
import Ingredients from './ingredients';
import Results from './results';
import Skills from './skills';
import Language from './language';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Map, Set } from 'immutable';
import ExportDialog from "./export-dialog";
import ImportDialog from "./import-dialog";
import topologicalSort from './topographical-sort';

/**
 * Main calculator
 */
export default class Calculator extends React.Component {
    constructor(props) {
        super(props);
        this.handleLanguageChange = this.handleLanguageChange.bind(this);

        this.handleAddSkill = this.handleAddSkill.bind(this);
        this.handleRemoveSkill = this.handleRemoveSkill.bind(this);
        this.handleChangeSkill = this.handleChangeSkill.bind(this);
        this.handleChangeTableSetting = this.handleChangeTableSetting.bind(this);

        this.handleImport = this.handleImport.bind(this);

        this.handlePriceChanged = this.handlePriceChanged.bind(this);

        this.handleAddRecipe = this.handleAddRecipe.bind(this);
        this.handleRemoveRecipe = this.handleRemoveRecipe.bind(this);

        const allSkills = {};
        Object.keys(props.config.Recipes).forEach(r => {
            const recipe = props.config.Recipes[r];
            Object.keys(recipe.requiredSkills).forEach(s => {
                allSkills[s] = 1;
            });
        });

        const languages = Object.keys(this.props.config.Localization);

        this.state = {
            selectedRecipes: Map(),
            restRecipes: Object.keys(this.props.config.Recipes),
            allSkills: Object.keys(allSkills),
            skills: Map(),
            tableSettings: Map(),
            ingredients: {},
            languages: languages,
            language: languages[0],
            localization: this.props.config.Localization[languages[0]],
            exportData: Map(),
        }
    }

    /**
     * On changing language
     */
    handleLanguageChange(language) {
        this.setState({
            language: language,
            localization: this.props.config.Localization[language]
        });
    }

    /**
     * On adding single recipe
     */
    handleAddRecipe(recipe) {
        this.setState((state, props) => {
            const index = state.restRecipes.indexOf(recipe);
            if (index < 0)
                return {};

            const products = props.config.Recipes[recipe].products;
            return {
                selectedRecipes: state.selectedRecipes.update(
                    Object.keys(products)[0],
                    (val = Map()) => val.set(recipe, 0)
                ),
            };
        });

        this.setState(this.updateRecipes);
        this.setState(this.updatePrices);
        this.setState(Calculator.updateExportData);
    }

    /**
     * On adding all recipes with specified skill
     */
    handleAddSkill(skillName) {
        if(typeof skillName === 'undefined')
            return;

        this.setState((state, props) => {
            let selectedRecipes = state.selectedRecipes;
            const recipes = props.config.Recipes;

            state.restRecipes
                .filter(recipe => recipes[recipe].requiredSkills.hasOwnProperty(skillName))
                .forEach(recipe => {
                    selectedRecipes = selectedRecipes.update(
                        Object.keys(recipes[recipe].products)[0],
                        (val = Map()) => val.set(recipe, 0)
                    );
                });

            return {selectedRecipes: selectedRecipes};
        });
        this.setState(this.updateRecipes);
        this.setState(this.updatePrices);
        this.setState(Calculator.updateExportData);
    }

    /**
     * On removing all recipes with specified skill
     */
    handleRemoveSkill(skillName) {
        if(typeof skillName === 'undefined')
            return;

        this.setState((state, props) => {
            return {selectedRecipes:
                    state.selectedRecipes
                        .map((recipes) => recipes.filterNot((price, recipe) => props.config.Recipes[recipe].requiredSkills.hasOwnProperty(skillName)))
                        .filter((recipes) => recipes.size > 0)
            };
        });
        this.setState(this.updateRecipes);
        this.setState(this.updatePrices);
        this.setState(Calculator.updateExportData);
    }


    /**
     * On removing recipe
     */
    handleRemoveRecipe(recipe) {
        const recipes = this.props.config.Recipes;

        if(this.state.selectedRecipes.has(recipe)){
            // it's result item
            this.setState({
                selectedRecipes: this.state.selectedRecipes.delete(recipe)
            });
        } else {
            // it's recipe
            this.setState({
                selectedRecipes: this.state.selectedRecipes.update(
                    recipes[recipe].result,
                    (val = Map()) => val.delete(recipe))
                    .filter(val => val.size > 0)
            });
        }
        this.setState(this.updateRecipes);
        this.setState(this.updatePrices);
        this.setState(Calculator.updateExportData);
    }

    /**
     * Updates export data
     */
    static updateExportData(state, props){
        return {
            'exportData': {
                'skills': state.skills,
                'ingredients': state.ingredients,
                'recipes': state.selectedRecipes.map(value => value.keySeq()).valueSeq().flatten()
            }
        };
    }

    /**
     * Imports data from json
     */
    handleImport(dataStr){
        let data = JSON.parse(dataStr);
        this.setState((state, props) => {
            let recipes = Map();
            data['recipes'].forEach((recipeName) => {
                recipes = recipes.update(props.config.Recipes[recipeName].result, Map(), recipeMap => recipeMap.set(recipeName, 0));
            });

            return {
                skills: Map(data['skills']).map((value) => Map(value)),
                ingredients: data['ingredients'],
                selectedRecipes: recipes
            };
        });
        this.setState(this.updateRecipes);
        this.setState(this.updatePrices);
        this.setState(Calculator.updateExportData);
    }

    /**
     * Updates skills & ingredients for selected recipes
     */
    updateRecipes(state, props){
        const selectedRecipes = state.selectedRecipes;

        const newRestRecipes =
            Object.keys(props.config.Recipes)
            .filter(recipe => !selectedRecipes.get(props.config.Recipes[recipe].result, Map()).has(recipe));

        let usedSkills = Map().withMutations(usedSkills => {
            selectedRecipes.valueSeq().forEach((recipes) => {
                recipes.keySeq().forEach((recipeId) => {
                    const recipe = props.config.Recipes[recipeId];
                    Object.keys(recipe.requiredSkills).forEach((skill) => {
                        if (!usedSkills.has(skill))
                            usedSkills.set(skill, Set());

                        recipe.tables.forEach((table) => {
                            usedSkills.update(skill, Set(), tables => tables.add(table));
                        });
                    });
                });
            });
        });

        const newIngredients = {};
        selectedRecipes.valueSeq().forEach((recipes) => {
            recipes.keySeq().forEach((recipe) => {
                Object.keys(props.config.Recipes[recipe].ingredients).forEach((ingredient) => {
                    newIngredients[ingredient] = (typeof state.ingredients[ingredient] !== 'undefined') ? state.ingredients[ingredient] : 0;
                });
            });
        });

        selectedRecipes.keySeq().forEach((result) => {
            delete newIngredients[result];
        });

        return {
            restRecipes: newRestRecipes,
            skills: state.skills
                .filter((skillData, skillName) => usedSkills.has(skillName))
                .withMutations((skills) => {
                    usedSkills.keySeq().forEach((skillName) => {
                        if(skills.has(skillName))
                            return;

                        skills.set(skillName, Map({'value': 0, 'lavish': false, 'tables': usedSkills.get(skillName)}));
                    });
                }),
            ingredients: newIngredients
        };
    }

    /**
     * When user updates skill value
     */
    handleChangeSkill(skillName, skillData){
        let skillValue = parseInt(skillData.get('value'));
        if(isNaN(skillValue)){
            skillValue = 0;
        }

        if(skillValue < 0){
            skillValue = 0;
        }

        if(skillValue >= 10){
            skillValue = skillValue % 10;
        }

        if(skillValue > 7){
            skillValue = 7;
        }

        let lavishValue = skillData.get('lavish');
        if(skillValue < 6) {
            lavishValue = false;
        }

        this.setState((state) => {
            if(skillValue >= 6 && state.skills.get(skillName).get('value') < 6 ){
                lavishValue = true;
            }

            return {
                skills: state.skills
                    .setIn([skillName, 'value'], skillValue)
                    .setIn([skillName, 'lavish'], lavishValue)
            };
        });
        this.setState(this.updatePrices);
        this.setState(Calculator.updateExportData);
    }

    handleChangeTableSetting(table, setting) {
        this.setState((state) => {
            return {
                tableSettings: state.tableSettings.setIn([table], setting),
            }
        });
        this.setState(this.updatePrices);
        this.setState(Calculator.updateExportData);
    }

    /**
     * When user updates ingredient price
     */
    handlePriceChanged(ingreident, price){
        const newIngredient = {};
        Object.assign(newIngredient, this.state.ingredients);

        price = price.replace(",", ".");
        if(isNaN(parseFloat(price))){
            newIngredient[ingreident] = 0;
        } else {
            newIngredient[ingreident] = price;
        }

        this.setState({
            ingredients: newIngredient
        });
        this.setState(this.updatePrices);
        this.setState(Calculator.updateExportData);
    }

    updatePrices(state, props){
        const ingredientPrices = {};
        const talents = {};
        const skills = {};

        state.skills.entrySeq().forEach(([skillName, skillData]) => {
            skills[skillName] = skillData.get('value');
            const talentName = skillName.substring(0, skillName.length - 5)  + "LavishResourcesTalent";
            talents[talentName] = skillData.get('lavish');
        });

        Object.keys(state.ingredients).forEach(ingredient => {
            ingredientPrices[ingredient] = parseFloat(state.ingredients[ingredient]);
        });

        let tries = 0;
        let selectedRecipes = state.selectedRecipes;
        const sortedRecipes = this.getSortedRecipes(state.selectedRecipes, props.config.Recipes);

        sortedRecipes.forEach((productId) => {
            const recipes = selectedRecipes.get(productId);
            if (recipes === undefined)
                return;

            recipes.keySeq().forEach((recipeId) => {
                const recipe = props.config.Recipes[recipeId];
                if (!this.isRecipeActive(recipe, state))
                    return;

                let price = 0;
                Object.keys(recipe.ingredients).forEach((ingredient) => {
                    let contribution = ingredientPrices[ingredient] * recipe.ingredients[ingredient].quantity;

                    if (!ingredient.isStatic) {
                        const lavish = this.getRecipeUsesLavish(recipe, state);
                        const moduleModifier = this.getRecipeModuleModifier(recipe, state); 
                        contribution *= (lavish ? 0.95 : 1) * moduleModifier;
                    }
                    
                    price += contribution;
                });

                Object.keys(recipe.products).forEach((product, index) => {
                    let quantity = recipe.products[product];
                    if (index === 0)
                    {
                        price /= quantity;

                        selectedRecipes = selectedRecipes.setIn([product, recipeId], price);
                        if(typeof ingredientPrices[product] !== 'undefined' && ingredientPrices[product] <= price)
                            return;

                        ingredientPrices[product] = price;
                    }
                });
            });
        });

        return {
            selectedRecipes: selectedRecipes
        };
    }

    getSortedRecipes(selectedRecipes, recipes) {
        const itemDependencies = {};
        selectedRecipes.keySeq().forEach((productId) => {
            selectedRecipes.get(productId).keySeq().forEach((recipeId) => {
                const ingredients = Object.keys(recipes[recipeId].ingredients);
                if (!itemDependencies.hasOwnProperty(productId))
                    itemDependencies[productId] = [];

                ingredients.forEach((ingredientId) => {
                    if (!itemDependencies.hasOwnProperty(ingredientId))
                        itemDependencies[ingredientId] = [];

                    itemDependencies[productId].push(ingredientId);
                });
            });
        });

        return topologicalSort(itemDependencies).reverse();
    }

    getRecipeUsesLavish(recipe, state) {
        const skills = state.skills.filter((data, skill) => recipe.requiredSkills.hasOwnProperty(skill) && data.get('lavish'));
        return skills.size > 0;
    }

    getRecipeModuleModifier(recipe, state) {
        const modifiers = state.tableSettings
            .filter((setting, table) => setting !== 'unused' && recipe.tables.includes(table))
            .valueSeq()
            .toArray()
            .map((setting) => parseFloat(setting, 10));
        
        return (modifiers.length > 0 ? Math.max(...modifiers) : 1);
    }

    isRecipeActive(recipe, state) {
        const settings = state.tableSettings
            .filter((setting, table) => setting !== 'unused' && recipe.tables.includes(table))
        
        return settings.size > 0;
    }

    render(){
        const activeRecipes = this.state.selectedRecipes
            .map((recipes, productId) => recipes.filter(
                (price, recipe) => this.isRecipeActive(this.props.config.Recipes[recipe], this.state)
            ))
            .filter((recipes) => recipes.size > 0);

        return(
            <Fragment>
                <Row>
                    <Col xs="auto">
                        <h1>Eco production calculator for ver {this.props.config.Version}</h1>
                    </Col>
                    <Col>
                        <Language
                            selected={this.state.language}
                            languages={this.state.languages}
                            onChange={this.handleLanguageChange}
                        />
                    </Col>
                </Row>
                <Row>
                    <Col xs={4} className="border mr-1">
                        <h2 className="text-center">Skills</h2>
                        <Skills
                            allSkills={this.state.allSkills}
                            skills={this.state.skills}
                            tableSettings={this.state.tableSettings}
                            localization={this.state.localization}
                            onChangeSkill={this.handleChangeSkill}
                            onAddSkill={this.handleAddSkill}
                            onRemoveSkill={this.handleRemoveSkill}
                            onChangeTableSetting={this.handleChangeTableSetting}
                        />

                    </Col>
                    <Col xs={3} className="border mr-1">
                        <h2 className="text-center">Ingredient prices</h2>
                        <Ingredients
                            ingredients={this.state.ingredients}
                            localization={this.state.localization}
                            onPriceChanged={this.handlePriceChanged} />
                    </Col>
                    <Col className="border">
                        <h2 className="text-center">Output prices</h2>
                        <Results
                            results={activeRecipes}
                            restRecipes={this.state.restRecipes}
                            localization={this.state.localization}
                            onRemoveRecipe={this.handleRemoveRecipe}
                            onAddRecipe={this.handleAddRecipe}
                        />
                    </Col>
                </Row>
                <ExportDialog
                    data={this.state.exportData}
                    onClose={this.props.onExportClose}
                    show={this.props.exportOpened}
                />
                <ImportDialog
                    onClose={this.props.onImportClose}
                    onImport={this.handleImport}
                    show={this.props.importOpened}
                />
            </Fragment>
        )
    }
}
