/**
 * File: JsExporter.cs
 * Eco Version: 8.2.8
 * JsExporter Version: 1.1
 * 
 * Author: koka
 * 
 * 
 * Exports recipes to use in javascript
 * 
 */

using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using Eco.Core.Plugins.Interfaces;
using Eco.Gameplay.Components;
using Eco.Gameplay.DynamicValues;
using Eco.Gameplay.Items;
using Eco.Shared;
using Eco.Shared.Localization;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace JsExporter
{
    public class JsExporter : IModKitPlugin
    {
        public JsExporter()
        {
            JToken result = new JObject();
            result["Version"] = EcoVersion.Version;
            result["Localization"] = new JObject();

            foreach (SupportedLanguage language in Enum.GetValues(typeof(SupportedLanguage)))
            {
                if (!Localizer.IsNormalizedLanguage(language))
                    continue;

                Localizer.TrySetLanguage(language);
                JObject localization = new JObject();
                result["Localization"][language.GetLocDisplayName().ToString()] = localization;

                foreach (Item item in Item.AllItems)
                {
                    localization[item.Type.Name] = (string)item.DisplayName;
                    foreach (Tag tag in item.Tags())
                    {
                        localization[tag.Name + "Tag"] = (string)tag.DisplayName;
                    }
                }

                foreach (RecipeFamily recipe in RecipeFamily.AllRecipes)
                {
                    localization[recipe.GetType().Name] = (string)recipe.DisplayName;
                }
            }

            JObject recipes = new JObject();
            result["Recipes"] = recipes;
            foreach (RecipeFamily family in RecipeFamily.AllRecipes)
            {
                recipes[family.GetType().Name] = ProcessRecipeType(family);
            }

            using (TextWriter textWriter = new StreamWriter("config.json"))
            using (JsonWriter jsonWriter = new JsonTextWriter(textWriter))
            {
                result.WriteTo(jsonWriter);
            }
        }

        /// <inheritdoc />
        public string GetStatus()
        {
            return "Idle.";
        }

        /// <inheritdoc />
        public override string ToString()
        {
            return nameof(JsExporter);
        }

        /// <summary>
        /// Checks recipe
        /// </summary>
        private JToken ProcessRecipeType(RecipeFamily family)
        {
            JObject recipeObj = new JObject();
            recipeObj["labor"] = family.LaborInCalories.GetBaseValue;
            recipeObj["numRecipes"] = family.Recipes.Count;

            recipeObj["products"] = new JObject();
            foreach (var product in family.Product)
            {
                string name = product.Item.Type.Name;
                recipeObj["products"][name] = product.Quantity.GetBaseValue;
            }

            recipeObj["ingredients"] = new JObject();
            foreach (var ingredient in family.Ingredients)
            {
                string name = (ingredient.IsSpecificItem ? ingredient.Item.Type.Name : ingredient.Tag.Name + "Tag");
                var ingredientObj = recipeObj["ingredients"][name] = new JObject();
                ingredientObj["isTag"] = !ingredient.IsSpecificItem;
                ingredientObj["isStatic"] = (ingredient.Quantity is ConstantValue);
                ingredientObj["quantity"] = ingredient.Quantity.GetBaseValue;
            }

            /* */
            var reqSkillsObj = recipeObj["requiredSkills"] = new JObject();
            foreach (var reqSkill in family.RequiredSkills)
            {
                string name = reqSkill.SkillItem.Type.Name;
                reqSkillsObj[name] = reqSkill.Level;
            }

            JArray tablesArray = new JArray();
            recipeObj["tables"] = tablesArray;
            foreach (var tableType in CraftingComponent.TablesForRecipe(family.GetType()))
            {
                WorldObjectItem creatingItem = WorldObjectItem.GetCreatingItemTemplateFromType(tableType);
                string name = creatingItem.Type.Name;
                tablesArray.Add(name);
            }
            /* */


            return recipeObj;
        }
    }
}
