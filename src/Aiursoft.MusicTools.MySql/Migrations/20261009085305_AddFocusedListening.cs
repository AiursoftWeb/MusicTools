using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aiursoft.MusicTools.MySql.Migrations
{
    /// <inheritdoc />
    public partial class AddFocusedListening : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContextMusicXmlPath",
                table: "Questions",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "FocusMeasureIndex",
                table: "Questions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FocusNoteIndex",
                table: "Questions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsFocused",
                table: "Questions",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "OptionCount",
                table: "Questions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Prompt",
                table: "Questions",
                type: "varchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContextMusicXmlPath",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "FocusMeasureIndex",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "FocusNoteIndex",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "IsFocused",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "OptionCount",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "Prompt",
                table: "Questions");
        }
    }
}
