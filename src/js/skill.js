import React, {Fragment} from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';

/**
 * Skill + talent block
 */
export default class Skill extends React.Component {
    constructor(props) {
        super(props);
        this.handleChangeSkill = this.handleChangeSkill.bind(this);
        this.handleRemoveSkill = this.handleRemoveSkill.bind(this);
        this.handleChangeLavish = this.handleChangeLavish.bind(this);
        this.handleChangeTableSetting = this.handleChangeTableSetting.bind(this);
    }

    handleChangeSkill(e){
        e.preventDefault();
        this.props.onChangeSkill(
            this.props.skillName,
            this.props.skillData.set('value', e.target.value)
        );
    }

    handleRemoveSkill(e){
        e.preventDefault();
        this.props.onRemoveSkill(this.props.skillName);
    }

    handleChangeLavish(e){
        e.preventDefault();
        const checked = e.target.checked;
        setTimeout(() => {
            this.props.onChangeSkill(
                this.props.skillName,
                this.props.skillData.set('lavish', checked)
            );
        }, 0);
    }

    handleChangeTableSetting(e){
        this.props.onChangeTableSetting(
            e.target.dataset.table,
            e.target.value
        );
    }

    render(){
        const skillName = this.props.skillName;
        const skillValue = this.props.skillData.get('value');
        const tables = this.props.skillData.get('tables');
        const tableSettings = this.props.tableSettings;
        const talentName = skillName.substring(0, skillName.length - 5)  + "LavishWorkspaceTalentGroup";

        return (
            <Fragment>
                <Row className="my-1">
                    <Form.Label column xs={8} htmlFor={skillName}>
                        {this.props.localization[skillName]}
                    </Form.Label>

                    <Col xs="3">
                        <Form.Control
                            id={skillName}
                            min="0"
                            max="7"
                            value={skillValue}
                            onChange={this.handleChangeSkill} />
                    </Col>
                    <Col xs="1">
                        <button type="button" className="close" aria-label="Close" onClick={this.handleRemoveSkill}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </Col>
                </Row>
                {tables.map((table) => 
                    <Row className="my-1">
                        <Col xs="7">
                            <label className="pl-3" htmlFor={skillName + table}>
                                {this.props.localization[table]}
                            </label>
                        </Col>

                        <Col xs="5">
                            <select className="custom-select" id={skillName + table} value={tableSettings[table]} data-table={table} onChange={this.handleChangeTableSetting}>
                                <option value="unused">Unused</option>
                                <option value="1">No Module</option>
                                <option value="0.9">Upgrade 1</option>
                                <option value="0.75">Upgrade 2</option>
                                <option value="0.6">Upgrade 3</option>
                                <option value="0.55">Upgrade 4</option>
                                <option value="0.5">Upgrade 5</option>
                            </select>
                        </Col>
                    </Row>
                )}
                {
                    (skillValue >=6 ) &&
                    <Form.Group className="mb-3" controlId={talentName} key={talentName}>
                        <Form.Check
                            inline
                            custom
                            label={this.props.localization[talentName]}
                            type="checkbox"
                            checked={this.props.skillData.get('lavish')}
                            onChange={this.handleChangeLavish} />
                    </Form.Group>
                }
            </Fragment>
        )
    }
}
